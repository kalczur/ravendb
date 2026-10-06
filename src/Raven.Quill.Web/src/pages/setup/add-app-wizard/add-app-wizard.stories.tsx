import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import type { MigrationFrame } from "@/api/custom-services/migration-service";
import type { AiHelperStatus, DiscoverResponse } from "@/api/generated/server-api";
import { assistantMocks } from "@/mocks/assistant-mocks";
import { AI_OUT_OF_TOKENS_MESSAGE } from "@/components/ai-consent/use-ai-consent";
import { FormWizard } from "@/components/form/wizard/form-wizard";
import { RANGE_PREVIEW_ROW_CLASSNAME } from "@/components/table/row-range-selection";
import { preventEnterKeySubmission } from "@/lib/form-utils";
import { defaultApiMocks } from "@/mocks/default-mocks";
import {
    migrationMocks,
    plannerDiscovery,
    SAMPLE_MIGRATION_CONVERSATION_ID,
    SAMPLE_MIGRATION_RETRY_PROMPT,
    sampleCustomersCollection,
    sampleMigrationAskFrames,
    sampleMigrationProposal,
    sampleMigrationQuestionsReply,
    sampleMigrationRetryFrames,
    sampleMigrationStartFrames,
} from "@/mocks/migration-mocks";
import {
    discoveryWithAllStates,
    failedCdcVerification,
    failedDiscovery,
    failedMappingTest,
    manyTablesDiscovery,
    sampleDiscovery,
    setupMocks,
} from "@/mocks/setup-mocks";
import { AddAppWizard } from "./add-app-wizard";
import { getAppFlow, useAppSteps } from "./app-wizard-flow";
import { useSetupWizardStore } from "./app-wizard-store";
import { isTableSupported } from "./discover-utils";
import { appSchema, type AppFormData, type AppStepId } from "./app-wizard-validation";
import { computeSourceKey } from "./steps/connect/use-connect-source-step";
import { composeAnswersPrompt, splitOpenQuestions } from "./steps/map/planner-questions-utils";
import { computeMapKey } from "./steps/map/use-map-schema-step";
import { consumePlannerFrame } from "./steps/map/use-planner-session";
import { createEmptyRootTable, scaffoldRootTable } from "./steps/map-tables/map-tables-utils";

const meta = {
    title: "Setup/Add App Wizard",
    component: AddAppWizard,
    parameters: {
        page: { bare: true },
    },
} satisfies Meta<typeof AddAppWizard>;

export default meta;

type Story = StoryObj<typeof meta>;

// The full wizard, mounted at the first step through the real entry component (form
// creation, store reset, and provision mutation wired up).
export const Default: Story = {};

// Valid values for every step, so any step renders with realistic data and Next/Back keep
// working against the default MSW mocks. The verify step's initial selection follows the
// discovery being shown; map/preview always seed from the clean happy-path discovery.
function buildSeed(discovery: DiscoverResponse): AppFormData {
    return {
        dataSource: { source: "external" },
        externalConnection: {
            appName: "AcmeShop",
            slug: "acme-shop",
            provider: "Npgsql",
            mode: "fields",
            fields: {
                host: "localhost",
                port: 5432,
                database: "acme_shop",
                username: "admin",
                password: "secret",
                ssl: "disable",
            },
            connectionString: "",
        },
        verifySchema: {
            tables: discovery.tables
                .filter((table) => isTableSupported(discovery, table))
                .map((table) => ({
                    sourceTableSchema: table.sourceTableSchema,
                    sourceTableName: table.sourceTableName,
                })),
        },
        map: { source: "ai-suggested", aiPrompt: "Embed order line items and link customers by id." },
        mapTables: { tables: sampleDiscovery.tables.map((table) => scaffoldRootTable(sampleDiscovery, table)) },
        preview: { table: "dbo.Customers", maxRows: 1 },
    };
}

// Replaces the discover handler so re-discovery ("Customize schemas") stays consistent
// with the seeded result, keeping the rest of the setup mocks intact.
function discoverHandlers(discovery: DiscoverResponse) {
    return { setup: [setupMocks.discover(discovery), ...defaultApiMocks.setup] };
}

function consentHandlers(status: AiHelperStatus) {
    return { assistant: [assistantMocks.consent({ status }), ...defaultApiMocks.assistant] };
}

// Renders the real wizard jumped to a single step. The body components read the discovery
// result and map-tables selection from the store, so seed both before they first render. The
// store is module state shared by every story, so it is reset first to keep one story's planner
// session out of the next.
function AppWizardAtStep({
    initialStep,
    discovery = sampleDiscovery,
    isMappingApplied = true,
    hasSelectedTables = true,
    seedOverride,
    seedStore,
}: {
    initialStep: AppStepId;
    discovery?: DiscoverResponse;
    /** When false, the map-tables step treats its seeded tables as stale and asks the AI again. */
    isMappingApplied?: boolean;
    /** When false, the verify step starts with nothing selected, as it does on a fresh discovery. */
    hasSelectedTables?: boolean;
    seedOverride?: (seed: AppFormData) => AppFormData;
    /** Layers story-specific state onto the seeded store. */
    seedStore?: () => void;
}) {
    const [seed] = useState(() => {
        const built = buildSeed(discovery);
        const values = hasSelectedTables ? built : { ...built, verifySchema: { tables: [] } };

        return seedOverride ? seedOverride(values) : values;
    });

    useState(() => {
        useSetupWizardStore.getState().reset();
        useSetupWizardStore.setState({
            discoverResult: discovery,
            discoverSchemas: [],
            editedAppSlug: null,
            initialSelectedTables: null,
            connectKey: null,
            appliedMapKey: isMappingApplied
                ? computeMapKey({
                      sourceKey: computeSourceKey(seed.externalConnection),
                      source: seed.map.source,
                      aiPrompt: seed.map.aiPrompt,
                      selectedTables: seed.verifySchema.tables,
                  })
                : null,
            mapTablesKey: null,
            mapActiveTable: { type: "root", path: "mapTables.tables.0" },
            mapExpandedPaths: {},
        });
        seedStore?.();
    });

    const form = useForm<AppFormData>({
        mode: "onChange",
        defaultValues: seed,
        resolver: zodResolver(appSchema),
    });

    return (
        <FormProvider {...form}>
            <form className="h-full" onSubmit={(event) => event.preventDefault()} onKeyDown={preventEnterKeySubmission}>
                <AppWizardStepBody initialStep={initialStep} />
            </form>
        </FormProvider>
    );
}

// useAppSteps reads the form via context, so it must run inside the provider above.
function AppWizardStepBody({ initialStep }: { initialStep: AppStepId }) {
    const steps = useAppSteps();

    return (
        <FormWizard
            steps={steps}
            flow={getAppFlow({ dataSource: "external" })}
            initialStep={initialStep}
            cancel={() => {}}
            completion={{ type: "submit", label: "Create app & continue", busyLabel: "Creating app..." }}
        />
    );
}

/**
 * What the select-all box actually draws. `aria-checked` was already correct while a partial
 * selection still rendered the same checkmark as a complete one, so the mark is the part worth
 * asserting: "check" for every row, "dash" for some, "empty" for none.
 */
function readSelectAllMark(canvasElement: HTMLElement): "check" | "dash" | "empty" {
    const box = within(canvasElement).getByRole("checkbox", { name: "Select all" });
    const marks = [...box.querySelectorAll("svg")].filter((svg) => getComputedStyle(svg).display !== "none");

    if (marks.length === 0) {
        return "empty";
    }
    if (marks.length > 1) {
        throw new Error(`Expected one visible mark in the select-all box, found ${marks.length}`);
    }

    return marks[0]!.classList.contains("lucide-minus") ? "dash" : "check";
}

export const ChooseDataSource: Story = {
    render: () => <AppWizardAtStep initialStep="dataSource" />,
};

export const ConnectSource: Story = {
    render: () => <AppWizardAtStep initialStep="externalConnection" />,
    // Switching the database type applies its default port and leaves the other details untouched.
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await userEvent.click(canvas.getByRole("button", { name: /sql server/i }));

        expect(canvas.getByLabelText(/port/i)).toHaveValue(1433);
        expect(canvas.getByLabelText(/host/i)).toHaveValue("localhost");
    },
};

const SEEDED_CONNECTION_STRING = "Host=localhost;Port=5432;Database=acme_shop;Username=admin;Password=secret";

export const ConnectSourceConnectionString: Story = {
    render: () => (
        <AppWizardAtStep
            initialStep="externalConnection"
            seedOverride={(seed) => ({
                ...seed,
                externalConnection: {
                    ...seed.externalConnection,
                    mode: "raw",
                    connectionString: SEEDED_CONNECTION_STRING,
                },
            })}
        />
    ),
    // Switching the database type leaves the pasted connection string untouched.
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await userEvent.click(canvas.getByRole("button", { name: /mysql/i }));

        expect(canvas.getByRole("textbox", { name: /connection string/i })).toHaveValue(SEEDED_CONNECTION_STRING);
    },
};

// Import is a header action next to the step title, and it no longer waits for an app name:
// the wizard endpoints get a draft slug until the operator provides a real one.
export const ConnectSourceImport: Story = {
    render: () => (
        <AppWizardAtStep
            initialStep="externalConnection"
            seedOverride={(seed) => ({
                ...seed,
                externalConnection: { ...seed.externalConnection, appName: "", slug: "" },
            })}
        />
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const heading = canvas.getByRole("heading", { name: /connect to your source database/i });
        const importButton = canvas.getByRole("button", { name: /import configuration/i });

        expect(canvas.getByLabelText(/app name/i)).toHaveValue("");
        expect(importButton).toBeEnabled();

        // The heading sits in the title block, whose row also carries the header action.
        expect(heading.parentElement?.parentElement).toContainElement(importButton);
    },
};

const connectFailureHandlers = {
    setup: [
        setupMocks.connect({
            success: false,
            errors: [
                {
                    message:
                        "Could not connect to the source database. Check that the host and port are reachable, " +
                        "the database name is correct, and the credentials are valid. " +
                        '28P01: password authentication failed for user "admin"',
                    details:
                        'Npgsql.NpgsqlException (0x80004005): 28P01: password authentication failed for user "admin"\n' +
                        "   at Npgsql.Internal.NpgsqlConnector.<Authenticate>d__0.MoveNext()\n" +
                        "   at Npgsql.Internal.NpgsqlConnector.<Open>d__1.MoveNext()\n" +
                        "   at Npgsql.NpgsqlConnection.<OpenAsync>d__2.MoveNext()",
                },
            ],
        }),
        ...defaultApiMocks.setup,
    ],
};

export const ConnectSourceError: Story = {
    parameters: { msw: { handlers: connectFailureHandlers } },
    render: () => <AppWizardAtStep initialStep="externalConnection" />,
    // A failure belongs to the connection it was made with: editing any part of that connection
    // drops it, and exactly one alert shows at a time.
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const findAlerts = () => canvas.queryAllByText(/could not connect to the source database/i);

        await userEvent.click(canvas.getByRole("button", { name: /test connection/i }));
        await waitFor(() => expect(findAlerts()).toHaveLength(1));

        await userEvent.click(canvas.getByRole("button", { name: /sql server/i }));
        await waitFor(() => expect(findAlerts()).toHaveLength(0));

        await userEvent.click(canvas.getByRole("button", { name: /test connection/i }));
        await waitFor(() => expect(findAlerts()).toHaveLength(1));

        // Back on the provider that failed first, the alert stays gone and nothing claims success.
        await userEvent.click(canvas.getByRole("button", { name: /postgresql/i }));
        await waitFor(() => expect(findAlerts()).toHaveLength(0));
        expect(canvas.getByRole("button", { name: /test connection/i })).toBeEnabled();
    },
};

// Verified tables (one with table-level warnings), tables that need configuration (CDC
// disabled and an unsupported reason), and a response-level warning banner.
export const VerifySchema: Story = {
    parameters: { msw: { handlers: discoverHandlers(discoveryWithAllStates) } },
    render: () => <AppWizardAtStep initialStep="verifySchema" discovery={discoveryWithAllStates} />,
    // Every verified table starts selected, so the header draws a check rather than a partial dash.
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitFor(() => expect(canvas.getByRole("checkbox", { name: "Select all" })).toBeInTheDocument());
        expect(readSelectAllMark(canvasElement)).toBe("check");
    },
};

// Discovery failed: only the destructive error banner is shown, no tables.
export const VerifySchemaDiscoveryFailed: Story = {
    parameters: { msw: { handlers: discoverHandlers(failedDiscovery) } },
    render: () => <AppWizardAtStep initialStep="verifySchema" discovery={failedDiscovery} />,
};

// The array-level "at least one table" error must clear as soon as a table is selected.
export const VerifySchemaWithoutSelection: Story = {
    render: () => <AppWizardAtStep initialStep="verifySchema" hasSelectedTables={false} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await userEvent.click(canvas.getByRole("button", { name: /^next$/i }));
        await waitFor(() => expect(canvas.getByText("At least one table is required")).toBeInTheDocument());

        await userEvent.click(canvas.getAllByRole("checkbox", { name: "Select row" })[0]);
        await waitFor(() => expect(canvas.queryByText("At least one table is required")).not.toBeInTheDocument());
    },
};

export const VerifySchemaSelectionLimit: Story = {
    parameters: { msw: { handlers: discoverHandlers(manyTablesDiscovery) } },
    render: () => (
        <AppWizardAtStep initialStep="verifySchema" discovery={manyTablesDiscovery} hasSelectedTables={false} />
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // One instance for the whole run: the direct userEvent API starts a fresh one per call,
        // which would drop the held shift key before the range click.
        const user = userEvent.setup();
        const rowCheckboxes = () => canvas.getAllByRole("checkbox", { name: "Select row" });
        const selectAll = () => canvas.getByRole("checkbox", { name: "Select all" });
        const limitNotice = () => canvas.queryByText(/one app processes at most 64 tables/i);
        const previewedRows = () => canvasElement.querySelectorAll(`.${RANGE_PREVIEW_ROW_CLASSNAME}`);
        const selectAllMark = () => readSelectAllMark(canvasElement);

        expect(canvas.getByText(/to select a range of tables/i)).toBeInTheDocument();
        expect(selectAllMark()).toBe("empty");

        await user.click(rowCheckboxes()[0]);

        // Holding shift previews the range from the anchor to the hovered row before taking it.
        await user.keyboard("{Shift>}");
        await user.hover(rowCheckboxes()[3]);
        await waitFor(() => expect(previewedRows()).toHaveLength(4));

        await user.click(rowCheckboxes()[3]);
        await user.keyboard("{/Shift}");
        await waitFor(() => expect(canvas.getByText(/4 out of 80 tables selected/)).toBeInTheDocument());
        await waitFor(() => expect(previewedRows()).toHaveLength(0));
        expect(limitNotice()).not.toBeInTheDocument();
        // 4 of 80 is a partial selection, so the header must not claim everything is selected.
        expect(selectAll()).toHaveAttribute("aria-checked", "mixed");
        expect(selectAllMark()).toBe("dash");

        await user.click(selectAll());
        await waitFor(() => expect(canvas.getByText(/64 out of 80 tables selected/)).toBeInTheDocument());
        expect(limitNotice()).toBeInTheDocument();
        // The limit stops select-all short of every row, so the selection stays partial.
        expect(selectAllMark()).toBe("dash");

        await user.click(selectAll());
        await waitFor(() => expect(limitNotice()).not.toBeInTheDocument());
        expect(selectAllMark()).toBe("empty");
    },
};

// A shift-click has to be able to start a multi-selection from an empty one. The range used to
// inherit the anchor row's own state, so with nothing selected the click cleared an already empty
// range - and suppressed the plain toggle on the way - leaving the click with no effect at all.
export const VerifySchemaShiftSelectFromEmpty: Story = {
    parameters: { msw: { handlers: discoverHandlers(manyTablesDiscovery) } },
    render: () => (
        <AppWizardAtStep initialStep="verifySchema" discovery={manyTablesDiscovery} hasSelectedTables={false} />
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const user = userEvent.setup();
        const rowCheckboxes = () => canvas.getAllByRole("checkbox", { name: "Select row" });
        const selectedCount = () => rowCheckboxes().filter((box) => box.getAttribute("aria-checked") === "true").length;

        // Leaves an anchor behind on an empty selection - where an operator lands after picking a
        // table and changing their mind.
        await user.click(rowCheckboxes()[0]);
        await waitFor(() => expect(selectedCount()).toBe(1));
        await user.click(rowCheckboxes()[0]);
        await waitFor(() => expect(selectedCount()).toBe(0));

        await user.keyboard("{Shift>}");
        await user.click(rowCheckboxes()[4]);
        await user.keyboard("{/Shift}");

        await waitFor(() => expect(canvas.getByText(/5 out of 80 tables selected/)).toBeInTheDocument());

        // Shift-clicking inside the range it just took clears it again.
        await user.keyboard("{Shift>}");
        await user.click(rowCheckboxes()[4]);
        await user.keyboard("{/Shift}");

        await waitFor(() => expect(selectedCount()).toBe(0));
    },
};

// The anchor is only ever recorded by clicking a row, so a selection that arrived any other way -
// seeded from a stored configuration, or cleared through "Deselect all" - used to leave the first
// shift-click with no second endpoint, degrading it to a plain single toggle.
export const VerifySchemaShiftSelectWithoutClicking: Story = {
    parameters: { msw: { handlers: discoverHandlers(discoveryWithAllStates) } },
    render: () => <AppWizardAtStep initialStep="verifySchema" discovery={discoveryWithAllStates} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const user = userEvent.setup();
        const rowCheckboxes = () => canvas.getAllByRole("checkbox", { name: "Select row" });
        const selectedCount = () => rowCheckboxes().filter((box) => box.getAttribute("aria-checked") === "true").length;

        // Clears the seeded selection without ever clicking a row, so no anchor is recorded.
        await user.click(canvas.getByRole("button", { name: /deselect all/i }));
        await waitFor(() => expect(selectedCount()).toBe(0));

        // The range still opens, counted from the top of the table.
        await user.keyboard("{Shift>}");
        await user.click(rowCheckboxes()[2]);
        await user.keyboard("{/Shift}");

        await waitFor(() => expect(selectedCount()).toBe(3));
    },
};

export const VerifySchemaCdcVerificationFailed: Story = {
    parameters: {
        msw: { handlers: { setup: [setupMocks.verifyCdc(failedCdcVerification), ...defaultApiMocks.setup] } },
    },
    render: () => <AppWizardAtStep initialStep="verifySchema" />,
    // The dry run's blockers keep the wizard on this step and stay on screen until the selection changes.
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        // The failed run reports an error and a warning, so the alert shows the two-entry summary
        // and keeps the individual blockers in its collapsible details.
        const findAlert = () => canvas.queryByText(/data source verification failed for the selected tables/i);

        await userEvent.click(canvas.getByRole("button", { name: /^next$/i }));
        await waitFor(() => expect(findAlert()).toBeInTheDocument());
        expect(canvas.getByRole("heading", { name: /verify your schema/i })).toBeInTheDocument();

        await userEvent.click(canvas.getByRole("button", { name: /show details/i }));
        expect(canvas.getByText(/must have the REPLICATION role attribute/i)).toBeInTheDocument();

        await userEvent.click(canvas.getAllByRole("checkbox", { name: "Select row" })[0]);
        await waitFor(() => expect(findAlert()).not.toBeInTheDocument());
    },
};

/** One exchange with the planner: the operator's prompt (none for the opening turn) and the frames streamed back. */
type PlannerTurn = { prompt?: string; frames: MigrationFrame[] };

const PLANNER_ANSWERS_PROMPT = composeAnswersPrompt(
    splitOpenQuestions(sampleMigrationQuestionsReply.openQuestions).pickable,
    [0, 0],
    false,
);

const PLANNER_START_TURN: PlannerTurn = { frames: sampleMigrationStartFrames };
const PLANNER_ANSWER_TURN: PlannerTurn = { prompt: PLANNER_ANSWERS_PROMPT, frames: sampleMigrationAskFrames };
const PLANNER_RETRY_TURN: PlannerTurn = { prompt: SAMPLE_MIGRATION_RETRY_PROMPT, frames: sampleMigrationRetryFrames };

const PLANNER_PROPOSAL_TURN: PlannerTurn = {
    frames: [
        sampleMigrationProposal,
        {
            type: "reply",
            reply:
                "I grouped your 6 tables into **3 collections**. Tell me which ones to build, or ask for a " +
                "different split.",
            gaps: ["No column says which address is the customer's default shipping address."],
            openQuestions: [],
        },
        { type: "done", conversationId: SAMPLE_MIGRATION_CONVERSATION_ID },
    ],
};

// Seeds the session through its own frame handling, so the transcript reads exactly like a streamed
// one, and Send or Submit answers carry on from it against the migration mocks.
function replayPlannerTurns(turns: PlannerTurn[]) {
    const store = useSetupWizardStore.getState();

    turns.forEach(({ prompt, frames }, index) => {
        if (prompt) {
            store.appendPlannerMessage({ id: `story-prompt-${index}`, role: "user", text: prompt });
            store.setPlannerQuestions([]);
        }

        frames.forEach(consumePlannerFrame);
    });
}

// Every planner story is a first visit: no mapping in the form yet, so the planner is what
// "Apply to mapping" waits on.
function PlannerAtStep({
    turns = [],
    isStreaming = false,
    deselectedCollections = [],
}: {
    turns?: PlannerTurn[];
    /** Holds the session mid-turn. Nothing is actually streaming, so Stop has nothing to abort. */
    isStreaming?: boolean;
    deselectedCollections?: string[];
}) {
    return (
        <AppWizardAtStep
            initialStep="map"
            discovery={plannerDiscovery}
            seedOverride={(seed) => ({ ...seed, mapTables: { tables: [] } })}
            seedStore={() => {
                const store = useSetupWizardStore.getState();

                replayPlannerTurns(turns);
                deselectedCollections.forEach((collection) => store.togglePlannerCollection(collection, false));
                store.setIsPlannerStreaming(isStreaming);
            }}
        />
    );
}

const findApplyButton = (canvasElement: HTMLElement) =>
    within(canvasElement).getByRole("button", { name: /apply to mapping/i });

// Nothing started yet. Start streams a sample session from the mocks and answering its questions
// registers collections, so the whole conversation can be clicked through from here.
export const Planner: Story = {
    render: () => <PlannerAtStep />,
};

// Start was just pressed and nothing has come back yet.
export const PlannerStarting: Story = {
    render: () => <PlannerAtStep isStreaming />,
};

// The planner proposed a model and waits on decisions, so its questions take the composer's place.
export const PlannerQuestions: Story = {
    render: () => <PlannerAtStep turns={[PLANNER_START_TURN]} />,
};

// A proposal with nothing to answer: the composer is open and no proposed collection is registered yet.
export const PlannerProposal: Story = {
    render: () => <PlannerAtStep turns={[PLANNER_PROPOSAL_TURN]} />,
};

// Mid-turn: Stop replaces Send, and everything that would race the stream is disabled.
export const PlannerWorking: Story = {
    render: () => (
        <PlannerAtStep
            turns={[PLANNER_START_TURN, { prompt: PLANNER_ANSWERS_PROMPT, frames: [sampleCustomersCollection] }]}
            isStreaming
        />
    ),
};

// Two collections registered, one with a warning, and a third rejected with the reasons on its card.
export const PlannerCollections: Story = {
    render: () => <PlannerAtStep turns={[PLANNER_START_TURN, PLANNER_ANSWER_TURN]} />,
};

// A follow-up registered the rejected collection and re-registered another, which now reads "replaced".
export const PlannerRevisedCollections: Story = {
    render: () => <PlannerAtStep turns={[PLANNER_START_TURN, PLANNER_ANSWER_TURN, PLANNER_RETRY_TURN]} />,
};

// Every registered collection unchecked leaves nothing to apply.
export const PlannerNothingSelected: Story = {
    render: () => (
        <PlannerAtStep
            turns={[PLANNER_START_TURN, PLANNER_ANSWER_TURN]}
            deselectedCollections={["Customers", "Orders"]}
        />
    ),
    play: async ({ canvasElement }) => {
        expect(findApplyButton(canvasElement)).toBeDisabled();
    },
};

// The session failed before the planner handed back a conversation, so there is nothing to reply to.
export const PlannerError: Story = {
    render: () => (
        <PlannerAtStep
            turns={[
                {
                    frames: [
                        { type: "note", text: "Read the schema of 6 tables." },
                        { type: "error", message: "The AI service failed (HTTP 502)." },
                    ],
                },
            ]}
        />
    ),
};

// No consent on file yet: the banner asks for it above the planner.
export const PlannerConsentRequired: Story = {
    parameters: { msw: { handlers: consentHandlers("ConsentRequired") } },
    render: () => <PlannerAtStep />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitFor(() =>
            expect(canvas.getByRole("button", { name: /review the terms of use/i })).toBeInTheDocument(),
        );
    },
};

// A license that rules AI out leaves nothing to accept, so only manual mapping can carry the wizard on.
export const PlannerAiUnavailable: Story = {
    parameters: { msw: { handlers: consentHandlers("InvalidCredentials") } },
    render: () => <PlannerAtStep />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitFor(() => expect(canvas.getByRole("alert")).toBeInTheDocument());
        expect(canvas.queryByRole("button", { name: /review the terms of use/i })).not.toBeInTheDocument();
    },
};

// An exhausted quota also leaves nothing to accept, but unlike a license answer it offers a retry.
export const PlannerAiOutOfTokens: Story = {
    parameters: { msw: { handlers: consentHandlers("OutOfTokens") } },
    render: () => <PlannerAtStep />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitFor(() => expect(canvas.getByRole("alert")).toHaveTextContent(AI_OUT_OF_TOKENS_MESSAGE));
        expect(canvas.getByRole("button", { name: /try again/i })).toBeEnabled();
    },
};

// The server rejected the assembled plan, so the wizard stays on the step and lists why.
export const PlannerApplyFailed: Story = {
    parameters: { msw: { handlers: { setup: [migrationMocks.applyRejected(), ...defaultApiMocks.setup] } } },
    render: () => <PlannerAtStep turns={[PLANNER_START_TURN, PLANNER_ANSWER_TURN, PLANNER_RETRY_TURN]} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // The button waits on the consent check before it lets the plan through.
        await waitFor(() => expect(findApplyButton(canvasElement)).toBeEnabled());
        await userEvent.click(findApplyButton(canvasElement));

        await waitFor(() => expect(canvas.getByText(/is not part of the selected collections/i)).toBeInTheDocument());
        expect(canvas.getByRole("heading", { name: /design your document model/i })).toBeInTheDocument();
    },
};

/*
   The two stories below drive the planner end to end. Each one ends up looking like a state already
   on show above, so they are tagged "!dev" to keep them out of the sidebar.
*/

// A whole session against the mocks: start, skip the questions, and the collections arrive.
export const PlannerSessionFlow: Story = {
    tags: ["!dev"],
    parameters: {
        msw: {
            handlers: {
                setup: [
                    migrationMocks.start(sampleMigrationStartFrames, 0),
                    migrationMocks.ask(sampleMigrationAskFrames, 0),
                    ...defaultApiMocks.setup,
                ],
            },
        },
    },
    render: () => <PlannerAtStep />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await userEvent.click(canvas.getByRole("button", { name: /^start$/i }));
        await waitFor(() => expect(canvas.getByText(/the planner has 2 questions/i)).toBeInTheDocument());
        expect(findApplyButton(canvasElement)).toBeDisabled();

        await userEvent.click(canvas.getByRole("button", { name: /skip the questions/i }));

        await waitFor(() => expect(canvas.getByRole("tab", { name: /collections \(3\)/i })).toBeInTheDocument());
        expect(canvas.getByRole("checkbox", { name: /include orders in the mapping/i })).toBeChecked();
        await waitFor(() => expect(findApplyButton(canvasElement)).toBeEnabled());
    },
};

// Applying hands the registered collections to the mapping editor.
export const PlannerApplyToMapping: Story = {
    tags: ["!dev"],
    render: () => <PlannerAtStep turns={[PLANNER_START_TURN, PLANNER_ANSWER_TURN, PLANNER_RETRY_TURN]} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // The button waits on the consent check before it lets the plan through.
        await waitFor(() => expect(findApplyButton(canvasElement)).toBeEnabled());
        await userEvent.click(findApplyButton(canvasElement));

        await waitFor(() => expect(canvas.getByRole("heading", { name: /map schema/i })).toBeInTheDocument());
    },
};

export const MapTables: Story = {
    render: () => <AppWizardAtStep initialStep="mapTables" />,
};

// The raw editor can only be left through a mapping that validates, so an incomplete table (here a
// just-added empty one) must not be able to open it - that used to be a one-way trip into raw JSON.
export const MapTablesRawViewBlockedByInvalidTable: Story = {
    tags: ["!dev"],
    render: () => (
        <AppWizardAtStep
            initialStep="mapTables"
            seedOverride={(seed) => ({
                ...seed,
                mapTables: { tables: [...seed.mapTables.tables, createEmptyRootTable()] },
            })}
        />
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await userEvent.click(canvas.getByRole("switch", { name: /raw json/i }));

        await waitFor(() => expect(canvas.getByRole("switch", { name: /raw json/i })).not.toBeChecked());
        expect(canvas.getByPlaceholderText(/filter tables/i)).toBeInTheDocument();
    },
};

export const MapTablesUnselectedTable: Story = {
    render: () => (
        <AppWizardAtStep
            initialStep="mapTables"
            seedOverride={(seed) => ({
                ...seed,
                verifySchema: { tables: [{ sourceTableSchema: "dbo", sourceTableName: "Customers" }] },
            })}
        />
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.queryByText("1 deselected table will still be synced")).toBeInTheDocument();
    },
};

// The suggestion call routinely runs for more than a minute, so it is parked here to keep the
// progress skeleton and its stage labels on screen.
export const MapTablesSuggesting: Story = {
    parameters: { msw: { handlers: { setup: [setupMocks.suggestCdcPending(), ...defaultApiMocks.setup] } } },
    render: () => <AppWizardAtStep initialStep="mapTables" isMappingApplied={false} />,
};

export const Preview: Story = {
    render: () => <AppWizardAtStep initialStep="preview" />,
    // Export is a footer action, sharing the completion button's group.
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const exportButton = canvas.getByRole("button", { name: /export configuration/i });

        expect(exportButton.parentElement).toContainElement(canvas.getByRole("button", { name: /create app/i }));
    },
};

// The mapping ran but reported errors, so the preview shows the destructive banner instead of documents.
export const PreviewMappingErrors: Story = {
    parameters: {
        msw: { handlers: { setup: [setupMocks.testMapping(failedMappingTest), ...defaultApiMocks.setup] } },
    },
    render: () => <AppWizardAtStep initialStep="preview" />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitFor(() => expect(canvas.getByText("Testing the mapping failed")).toBeInTheDocument());

        // The banner is one alert, not an alert nested in another one.
        expect(canvasElement.querySelectorAll('[data-slot="alert"]')).toHaveLength(1);

        await userEvent.click(canvas.getByRole("button", { name: /show details/i }));
        expect(canvas.getByText(/is an invalid start of a value/i)).toBeInTheDocument();
    },
};
