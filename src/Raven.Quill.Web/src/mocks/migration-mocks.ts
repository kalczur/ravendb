import { delay, http, HttpResponse } from "msw";
import type { MigrationFrame } from "@/api/custom-services/migration-service";
import type {
    CdcSinkEmbeddedTableConfig,
    CdcSinkTableConfig,
    DiscoverColumnResponse,
    DiscoverResponse,
    MigrationApplyResponse,
} from "@/api/generated/server-api";
import { apiHttp } from "./api-http";

type ProposalFrame = Extract<MigrationFrame, { type: "proposal" }>;
type CollectionFrame = Extract<MigrationFrame, { type: "collection" }>;
type RejectedFrame = Extract<MigrationFrame, { type: "rejected" }>;
type ReplyFrame = Extract<MigrationFrame, { type: "reply" }>;

// migration/start and migration/ask stream NDJSON frames the OpenAPI contract does not describe, so
// those two use plain msw instead of `apiHttp` - mirroring appsMocks.setupTry.
export const migrationMocks = {
    start: (frames: MigrationFrame[] = sampleMigrationStartFrames, chunkDelayMs = 400) =>
        http.post("/api/setup/migration/start", () => streamFrames(frames, chunkDelayMs)),
    /** Never answers, so a started session stays on "Thinking..." until it is stopped. */
    startPending: () =>
        http.post("/api/setup/migration/start", async () => {
            await delay("infinite");
            return streamFrames([], 0);
        }),
    ask: (frames: MigrationFrame[] = sampleMigrationAskFrames, chunkDelayMs = 400) =>
        http.post("/api/setup/migration/ask", () => streamFrames(frames, chunkDelayMs)),
    apply: (result: MigrationApplyResponse = sampleMigrationApply) =>
        apiHttp.post("/api/setup/migration/apply", ({ response }) => response(200).json(result)),
    /** The assembled plan failed validation, which the server answers with a 422. */
    applyRejected: (errors: string[] = sampleMigrationApplyErrors) =>
        apiHttp.post("/api/setup/migration/apply", ({ response }) => response(422).json({ errors })),
    remove: () => apiHttp.post("/api/setup/migration/remove", ({ response }) => response(204).empty()),
};

function streamFrames(frames: MigrationFrame[], chunkDelayMs: number) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            for (const frame of frames) {
                await delay(chunkDelayMs);
                controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`));
            }

            controller.close();
        },
    });

    return new HttpResponse(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}

const column = (name: string, nativeType: string, isPrimaryKey = false): DiscoverColumnResponse => ({
    name,
    nativeType,
    suggestedType: "Default",
    isPrimaryKey,
    isCdcCapturable: true,
});

const foreignKey = (columnName: string, referencedTable: string) => ({
    columns: [columnName],
    referencedSchema: "dbo",
    referencedTable,
    referencedColumns: ["Id"],
});

// A small shop schema with enough shape for the planner to embed, link and drop tables. The
// frames below describe exactly these tables.
export const plannerDiscovery: DiscoverResponse = {
    catalogName: "demo_shop",
    success: true,
    hasPermissionToSetup: true,
    errors: [],
    warnings: [],
    tables: [
        {
            sourceTableSchema: "dbo",
            sourceTableName: "Customers",
            columns: [column("Id", "int", true), column("Name", "nvarchar(200)"), column("Email", "nvarchar(320)")],
            primaryKeyColumns: ["Id"],
            foreignKeys: [],
            isCdcEnabled: true,
            warnings: [],
        },
        {
            sourceTableSchema: "dbo",
            sourceTableName: "CustomerAddresses",
            columns: [
                column("Id", "int", true),
                column("CustomerId", "int"),
                column("City", "nvarchar(100)"),
                column("IsDefault", "bit"),
            ],
            primaryKeyColumns: ["Id"],
            foreignKeys: [foreignKey("CustomerId", "Customers")],
            isCdcEnabled: true,
            warnings: [],
        },
        {
            sourceTableSchema: "dbo",
            sourceTableName: "Orders",
            columns: [
                column("Id", "int", true),
                column("CustomerId", "int"),
                column("PlacedAt", "datetime2"),
                column("Total", "decimal(18,2)"),
            ],
            primaryKeyColumns: ["Id"],
            foreignKeys: [foreignKey("CustomerId", "Customers")],
            isCdcEnabled: true,
            warnings: [],
        },
        {
            sourceTableSchema: "dbo",
            sourceTableName: "OrderLines",
            columns: [
                column("Id", "int", true),
                column("OrderId", "int"),
                column("ProductId", "int"),
                column("Quantity", "int"),
            ],
            primaryKeyColumns: ["Id"],
            foreignKeys: [foreignKey("OrderId", "Orders"), foreignKey("ProductId", "Products")],
            isCdcEnabled: true,
            warnings: [],
        },
        {
            sourceTableSchema: "dbo",
            sourceTableName: "Products",
            columns: [column("Id", "int", true), column("Name", "nvarchar(200)"), column("Price", "decimal(18,2)")],
            primaryKeyColumns: ["Id"],
            foreignKeys: [],
            isCdcEnabled: true,
            warnings: [],
        },
        {
            sourceTableSchema: "dbo",
            sourceTableName: "AuditLog",
            columns: [column("Id", "bigint", true), column("Action", "nvarchar(50)"), column("CreatedAt", "datetime2")],
            primaryKeyColumns: ["Id"],
            foreignKeys: [],
            isCdcEnabled: true,
            warnings: [],
        },
    ],
};

export const sampleMigrationProposal: ProposalFrame = {
    type: "proposal",
    areas: [
        {
            area: "Customers",
            collections: ["Customers"],
            why: "Customers are read together with their addresses on every checkout.",
        },
        {
            area: "Sales",
            collections: ["Orders", "Products"],
            why: "Orders are what the app reasons about; products are shared by many of them.",
        },
    ],
    collections: [
        {
            collection: "Customers",
            rootTable: "dbo.Customers",
            absorbs: [
                {
                    table: "dbo.CustomerAddresses",
                    how: "Embed",
                    why: "An address belongs to one customer and is never read on its own.",
                },
            ],
            why: "One document per customer, so a profile loads in a single read.",
        },
        {
            collection: "Orders",
            rootTable: "dbo.Orders",
            absorbs: [
                { table: "dbo.OrderLines", how: "Embed", why: "Lines never exist outside their order." },
                { table: "dbo.Customers", how: "Link", why: "Customers change independently of their orders." },
            ],
            why: "An order with its lines is the unit every question about sales starts from.",
        },
        {
            collection: "Products",
            rootTable: "dbo.Products",
            absorbs: [],
            why: "Referenced by many order lines, so it stays a collection of its own.",
        },
    ],
    dropped: [
        {
            table: "dbo.AuditLog",
            why: "Write-only history the app never reads; migrating it would only add documents.",
        },
    ],
    enables: [
        "Show an order with all of its lines in a single document load.",
        "Answer what a customer bought without joining four tables.",
        "Keep each product's name and price in one place.",
    ],
};

export const sampleMigrationQuestionsReply: ReplyFrame = {
    type: "reply",
    reply:
        "I read **6 tables** and grouped them into **3 collections**. `dbo.AuditLog` is left out because " +
        "nothing in the app reads it.\n\nBefore I register anything, I need a few decisions from you.",
    gaps: ["No column says which address is the customer's default shipping address."],
    openQuestions: [
        {
            question: "How should order lines refer to products?",
            options: ["Link to Products by id", "Copy the product name and price into each line"],
            recommended: 0,
        },
        {
            question: "Which property casing should the documents use?",
            options: ["camelCase", "PascalCase", "Keep the source column names"],
            recommended: 0,
        },
        { question: "Should cancelled orders be migrated at all?", options: [], recommended: null },
    ],
};

const customersConfig: CdcSinkTableConfig = {
    collectionName: "Customers",
    sourceTableSchema: "dbo",
    sourceTableName: "Customers",
    primaryKeyColumns: ["Id"],
    columns: [
        { column: "Name", name: "name", type: "Default" },
        { column: "Email", name: "email", type: "Default" },
    ],
    patch: null,
    onDelete: { ignoreDeletes: false, patch: null },
    disabled: false,
    embeddedTables: [
        {
            sourceTableSchema: "dbo",
            sourceTableName: "CustomerAddresses",
            propertyName: "addresses",
            type: "Array",
            primaryKeyColumns: ["Id"],
            joinColumns: ["CustomerId"],
            columns: [
                { column: "City", name: "city", type: "Default" },
                { column: "IsDefault", name: "isDefault", type: "Default" },
            ],
            patch: null,
            onDelete: { ignoreDeletes: false, patch: null },
            embeddedTables: [],
            linkedTables: [],
        },
    ],
    linkedTables: [],
};

const orderLinesEmbed: CdcSinkEmbeddedTableConfig = {
    sourceTableSchema: "dbo",
    sourceTableName: "OrderLines",
    propertyName: "lines",
    type: "Array",
    primaryKeyColumns: ["Id"],
    joinColumns: ["OrderId"],
    columns: [
        { column: "ProductId", name: "productId", type: "Default" },
        { column: "Quantity", name: "quantity", type: "Default" },
    ],
    patch: null,
    onDelete: { ignoreDeletes: false, patch: null },
    embeddedTables: [],
    linkedTables: [],
};

const ordersConfig: CdcSinkTableConfig = {
    collectionName: "Orders",
    sourceTableSchema: "dbo",
    sourceTableName: "Orders",
    primaryKeyColumns: ["Id"],
    columns: [
        { column: "PlacedAt", name: "placedAt", type: "Default" },
        { column: "Total", name: "total", type: "Default" },
    ],
    patch: null,
    onDelete: { ignoreDeletes: false, patch: null },
    disabled: false,
    embeddedTables: [orderLinesEmbed],
    linkedTables: [
        {
            sourceTableSchema: "dbo",
            sourceTableName: "Customers",
            propertyName: "customer",
            joinColumns: ["CustomerId"],
            linkedCollectionName: "Customers",
        },
    ],
};

const productsConfig: CdcSinkTableConfig = {
    collectionName: "Products",
    sourceTableSchema: "dbo",
    sourceTableName: "Products",
    primaryKeyColumns: ["Id"],
    columns: [
        { column: "Name", name: "name", type: "Default" },
        { column: "Price", name: "price", type: "Default" },
    ],
    patch: null,
    onDelete: { ignoreDeletes: false, patch: null },
    disabled: false,
    embeddedTables: [],
    linkedTables: [],
};

export const sampleCustomersCollection: CollectionFrame = {
    type: "collection",
    status: "registered",
    collection: "Customers",
    version: 1,
    rationale: "Addresses are embedded as an array, so a customer's profile is one document.",
    config: customersConfig,
    warnings: [],
};

export const sampleOrdersCollection: CollectionFrame = {
    type: "collection",
    status: "registered",
    collection: "Orders",
    version: 1,
    rationale: "Lines are embedded; the customer is linked by id so customer edits never rewrite orders.",
    config: ordersConfig,
    warnings: ["dbo.Orders.Total is decimal(18,2) and is stored as a number, which can lose precision above 2^53."],
};

export const sampleRejectedProducts: RejectedFrame = {
    type: "rejected",
    collection: "Products",
    errors: [
        "Column 'Price' is mapped twice, as 'price' and 'unitPrice'.",
        "Primary key column 'ProductId' does not exist on dbo.Products.",
    ],
};

export const sampleProductsCollection: CollectionFrame = {
    type: "collection",
    status: "registered",
    collection: "Products",
    version: 1,
    rationale: "Registered with a single price property after the first attempt was rejected.",
    config: productsConfig,
    warnings: [],
};

// Once Products exists, order lines link to it instead of carrying a bare product id.
const revisedOrdersConfig: CdcSinkTableConfig = {
    ...ordersConfig,
    embeddedTables: [
        {
            ...orderLinesEmbed,
            columns: [{ column: "Quantity", name: "quantity", type: "Default" }],
            linkedTables: [
                {
                    sourceTableSchema: "dbo",
                    sourceTableName: "Products",
                    propertyName: "product",
                    joinColumns: ["ProductId"],
                    linkedCollectionName: "Products",
                },
            ],
        },
    ],
};

export const sampleRevisedOrdersCollection: CollectionFrame = {
    ...sampleOrdersCollection,
    status: "replaced",
    version: 2,
    rationale: "Order lines now link to Products, so a product rename shows up on every order.",
    config: revisedOrdersConfig,
};

export const sampleMigrationRegisteredReply: ReplyFrame = {
    type: "reply",
    reply:
        "Registered **Customers** and **Orders** with camelCase properties. **Products** was rejected - " +
        "the price column was mapped twice. Ask me to retry it, or carry on with the two that passed.",
    gaps: [],
    openQuestions: [],
};

export const SAMPLE_MIGRATION_CONVERSATION_ID = "migrations/demo-shop/1";

export const sampleMigrationStartFrames: MigrationFrame[] = [
    { type: "note", text: "Read the schema of 6 tables." },
    sampleMigrationProposal,
    sampleMigrationQuestionsReply,
    { type: "done", conversationId: SAMPLE_MIGRATION_CONVERSATION_ID },
];

export const sampleMigrationAskFrames: MigrationFrame[] = [
    { type: "conventions", propertyCase: "CamelCase", propertyLanguage: null, notes: null, mustReEmit: [] },
    sampleCustomersCollection,
    sampleOrdersCollection,
    sampleRejectedProducts,
    sampleMigrationRegisteredReply,
    { type: "done", conversationId: SAMPLE_MIGRATION_CONVERSATION_ID },
];

export const SAMPLE_MIGRATION_RETRY_PROMPT = "Retry Products with a single price property.";

export const sampleMigrationRetryFrames: MigrationFrame[] = [
    { type: "note", text: "Dropped the duplicate unitPrice mapping." },
    sampleProductsCollection,
    sampleRevisedOrdersCollection,
    {
        type: "reply",
        reply: "**Products** is registered now, and I re-registered **Orders** so its lines link to it.",
        gaps: [],
        openQuestions: [],
    },
    { type: "done", conversationId: SAMPLE_MIGRATION_CONVERSATION_ID },
];

export const sampleMigrationApply: MigrationApplyResponse = {
    configuration: {
        name: "cdc/demo-shop",
        connectionStringName: "demo-shop-mssql",
        tables: [customersConfig, revisedOrdersConfig, productsConfig],
    },
    unmappedTables: [],
    errors: [],
};

export const sampleMigrationApplyErrors = [
    "Orders: linked collection 'Customers' is not part of the selected collections.",
    "Orders.lines: join column 'OrderId' does not exist on dbo.OrderLines.",
];
