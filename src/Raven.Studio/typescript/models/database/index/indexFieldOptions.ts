/// <reference path="../../../../typings/tsd.d.ts"/>
import spatialOptions = require("models/database/index/spatialOptions");
import jsonUtil = require("common/jsonUtil");
import models = require("models/database/settings/databaseSettingsModels");
import typeUtils = require("common/typeUtils")

function labelMatcher<T>(labels: Array<valueAndLabelItem<T, string>>): (arg: T) => string {
    return(arg) => labels.find(x => x.value === arg).label;
}

function yesNoLabelProvider(arg: boolean) {
    return arg ? "Yes" : "No";
}

type indexingTypes = Raven.Client.Documents.Indexes.FieldIndexing | "Search (implied)";

type preDefinedAnalyzerNameForUI = "Keyword Analyzer" | "LowerCase Keyword Analyzer" | "LowerCase Whitespace Analyzer" |
                                   "NGram Analyzer" | "Simple Analyzer" | "Raven Standard Analyzer" | "Stop Analyzer" | "Whitespace Analyzer";

interface analyzerName {
    studioName: preDefinedAnalyzerNameForUI | string;
    serverName: string;
}

type databaseIndexConfigurationType = Record<string, models.serverWideOnlyEntry | models.databaseEntry<string | number>>;

class indexFieldOptions {
    analyzersNamesDictionary = ko.observableArray<analyzerName>([
        // default analyzer for Indexing.Exact
        { studioName: "Keyword Analyzer", serverName: "KeywordAnalyzer" },
        
        // default analyzer for Indexing.Default or when 'Indexing' options are not defined
        { studioName: "LowerCase Keyword Analyzer", serverName: "Raven.Server.Documents.Indexes.Persistence.Lucene.Analyzers.LowerCaseKeywordAnalyzer" },
        
        { studioName: "LowerCase Whitespace Analyzer", serverName: "LowerCaseWhitespaceAnalyzer" },
        { studioName: "NGram Analyzer", serverName:"NGramAnalyzer" },
        { studioName: "Simple Analyzer", serverName: "SimpleAnalyzer" },
        
        // default analyzer for Indexing.Search
        { studioName: "Raven Standard Analyzer", serverName: "RavenStandardAnalyzer" },
        
        { studioName: "Stop Analyzer", serverName: "StopAnalyzer" },
        { studioName: "Whitespace Analyzer", serverName:"WhitespaceAnalyzer" }
    ]);
    
    analyzersNames = ko.pureComputed(() => {
        return this.analyzersNamesDictionary().map(a => a.studioName)
            // exclude the default analyzer from dropdown list (shown only when Indexing.Default is selected)
            .filter(x => x !== "LowerCase Keyword Analyzer");
    })

    static readonly DefaultFieldOptions = "__all_fields";
    
    static readonly TermVectors: Array<valueAndLabelItem<Raven.Client.Documents.Indexes.FieldTermVector, string>> = [{
            label: "No",
            value: "No"
        }, {
            label: "With offsets",
            value: "WithOffsets"
        }, {
            label: "With positions",
            value: "WithPositions"
        }, {
            label: "With positions and offsets",
            value: "WithPositionsAndOffsets"
        }, {
            label: "Yes",
            value: "Yes"
        }
    ];

    static readonly Indexing: Array<valueAndLabelItem<Raven.Client.Documents.Indexes.FieldIndexing, string>> = [
        {
            label: "Default",
            value: "Default"
        }, {
            label: "No",
            value: "No"
            
        }, {
            label: "Exact",
            value: "Exact"
            
        }, {
            label: "Search",
            value: "Search"
        }];

    static readonly IndexingWithSearchImplied: Array<valueAndLabelItem<indexingTypes, string>> =
        [...indexFieldOptions.Indexing, { label: "Search (implied)", value: "Search (implied)" }];
    
    static readonly SpatialType: Array<Raven.Client.Documents.Indexes.Spatial.SpatialFieldType> = ["Cartesian", "Geography"];
    
    static readonly CircleRadiusType: Array<Raven.Client.Documents.Indexes.Spatial.SpatialUnits> = [ "Kilometers", "Miles"];

    name = ko.observable<string>();
    
    isDefaultFieldOptions = ko.pureComputed(() => this.name() === indexFieldOptions.DefaultFieldOptions);
    
    parent = ko.observable<indexFieldOptions>();

    analyzer = ko.observable<string>();
    disabledAnalyzerText = ko.observable<string>();
    analyzerPlaceHolder = ko.observable<string>();
    
    analyzerDefinedWithoutIndexing = ko.observable<boolean>(false);
    theAnalyzerThatWasDefinedWithoutIndexing = ko.observable<string>();

    isDefaultAnalyzer: KnockoutComputed<boolean>;
    showAnalyzer: KnockoutComputed<boolean>;

    indexing = ko.observable<indexingTypes>(); // the actual value
    effectiveIndexing = this.effectiveComputed(x => x.indexing(), labelMatcher(indexFieldOptions.IndexingWithSearchImplied)); // for button label
    defaultIndexing = this.defaultComputed(x => x.indexing(), labelMatcher(indexFieldOptions.IndexingWithSearchImplied)); // for dropdown label
    indexingDropdownOptions: KnockoutComputed<Array<valueAndLabelItem<indexingTypes, string>>>;

    storage = ko.observable<Raven.Client.Documents.Indexes.FieldStorage>();
    effectiveStorage = this.effectiveComputed(x => x.storage());
    defaultStorage = this.defaultComputed(x => x.storage());
    isStoreField: KnockoutComputed<boolean>;

    suggestions = ko.observable<boolean>();
    effectiveSuggestions = this.effectiveComputed(x => x.suggestions(), yesNoLabelProvider);
    defaultSuggestions = this.defaultComputed(x => x.suggestions(), yesNoLabelProvider);

    termVector = ko.observable<Raven.Client.Documents.Indexes.FieldTermVector>();
    effectiveTermVector = this.effectiveComputed(x => x.termVector(), labelMatcher(indexFieldOptions.TermVectors));
    defaultTermVector = this.defaultComputed(x => x.termVector(), labelMatcher(indexFieldOptions.TermVectors));

    fullTextSearch = ko.observable<boolean>();
    effectiveFullTextSearch = this.effectiveComputed(x => x.fullTextSearch(), yesNoLabelProvider);
    defaultFullTextSearch = this.defaultComputed(x => x.fullTextSearch(), yesNoLabelProvider);

    highlighting = ko.observable<boolean>();
    effectiveHighlighting = this.effectiveComputed(x => x.highlighting(), yesNoLabelProvider);
    defaultHighlighting = this.defaultComputed(x => x.highlighting(), yesNoLabelProvider);

    spatial = ko.observable<spatialOptions>();
    hasSpatialOptions = ko.observable<boolean>(false);

    indexOrStore: KnockoutComputed<boolean>;
    indexDefinitionHasReduce: KnockoutObservable<boolean>;
    
    showAdvancedOptions = ko.observable<boolean>(false);

    searchEngine = ko.observable<Raven.Client.Documents.Indexes.SearchEngineType>();

    indexLocalConfiguration: Raven.Client.Documents.Indexes.IndexConfiguration;
    databaseIndexConfiguration: databaseIndexConfigurationType;

    validationGroup: KnockoutObservable<any>;
    dirtyFlag: () => DirtyFlag;
    
    constructor(name: string,
                dto: Raven.Client.Documents.Indexes.IndexFieldOptions,
                indexHasReduce: KnockoutObservable<boolean>,
                engineType: KnockoutObservable<Raven.Client.Documents.Indexes.SearchEngineType>,
                parentFields?: indexFieldOptions,
                indexLocalConfiguration?: Raven.Client.Documents.Indexes.IndexConfiguration,
                databaseIndexConfiguration?: databaseIndexConfigurationType
    ) {
        this.name(name);
        this.parent(parentFields);
        this.indexDefinitionHasReduce = indexHasReduce;
        this.searchEngine = engineType;
        this.indexLocalConfiguration = indexLocalConfiguration;
        this.databaseIndexConfiguration = databaseIndexConfiguration;
        
        if (!typeUtils.isEmpty(databaseIndexConfiguration)) {
            Object.values(databaseIndexConfiguration).forEach((databaseIndexConfigurationElement) => {
                if (!this.analyzersNamesDictionary().some(x => x.serverName === databaseIndexConfigurationElement.effectiveValue())) {
                    this.analyzersNamesDictionary.push({
                        studioName: databaseIndexConfigurationElement.effectiveValue(),
                        serverName: databaseIndexConfigurationElement.effectiveValue()
                    });
                }
            });
        }
        
        if (!typeUtils.isEmpty(indexLocalConfiguration)) {
            Object.values(indexLocalConfiguration).forEach((indexConfigurationElement) => {
                if (!this.analyzersNamesDictionary().some(x => x.serverName === indexConfigurationElement)) {
                    this.analyzersNamesDictionary.push({
                        studioName: indexConfigurationElement,
                        serverName: indexConfigurationElement
                    });
                }
            });
        }
        
        const analyzerPositionInName = dto.Analyzer ? dto.Analyzer.lastIndexOf(".") : 0;
        const analyzerNameInDto = analyzerPositionInName !== -1 && dto.Analyzer ? dto.Analyzer.substring(analyzerPositionInName + 1) : dto.Analyzer;
        const analyzerInDictionary = this.analyzersNamesDictionary().find(x => x.serverName === analyzerNameInDto);
        
        let analyzerNameForStudio = null;
        
        if (analyzerInDictionary) {
            // analyzer is one of our pre-defined analyzers
            analyzerNameForStudio = analyzerInDictionary.studioName;
        } else if (dto.Analyzer) {
            // analyzer is a custom analyzer, add it to the names dictionary
            this.analyzersNamesDictionary.push({ studioName: dto.Analyzer, serverName: dto.Analyzer });
            analyzerNameForStudio = dto.Analyzer;
        }
        
        this.analyzer(analyzerNameForStudio);
        
        this.isDefaultAnalyzer = ko.pureComputed(() => this.analyzer() === "LowerCase Keyword Analyzer" ||
                                                       this.analyzer() === "Raven.Server.Documents.Indexes.Persistence.Lucene.Analyzers.LowerCaseKeywordAnalyzer" ||
                                                       this.analyzerPlaceHolder() === "LowerCase Keyword Analyzer");
        
        this.showAnalyzer = ko.pureComputed(() => this.indexing() === "Search" ||
                                                  this.indexing() === "Search (implied)" ||
                                                  (!this.indexing() && this.parent().indexing() === "Search") ||
                                                  !!this.analyzer() ||
                                                  (!this.analyzer() && !!this.analyzerPlaceHolder()));
        
        if (this.isDefaultAnalyzer()) {
            this.analyzer(null);
        }
        
        this.indexing(dto.Indexing);
        
        // for issue RavenDB-12607
        if (!dto.Indexing && this.analyzer() && !this.isDefaultAnalyzer()) {
           this.analyzerDefinedWithoutIndexing(true);
           this.theAnalyzerThatWasDefinedWithoutIndexing(this.analyzer());
           this.indexing("Search (implied)");
        }
        
        this.storage(dto.Storage);
        
        this.suggestions(dto.Suggestions);
        this.termVector(dto.TermVector);
        this.hasSpatialOptions(!!dto.Spatial);
        
        if (this.hasSpatialOptions()) {
            this.spatial(new spatialOptions(dto.Spatial));
        } else {
            this.spatial(spatialOptions.empty());
        }

        this.computeAnalyzer();
        this.computeFullTextSearch();
        this.computeHighlighting();
        
        _.bindAll(this, "toggleAdvancedOptions");

        this.initObservables();
        this.initValidation();

        if ((this.termVector() && this.termVector() !== "No") ||
            (this.indexing() && this.indexing() !== "Default")) {
            this.showAdvancedOptions(true);
        }
    }
    
    private initObservables() {
        // used to avoid circular updates
        let changeInProgress = false;

        this.fullTextSearch.subscribe(() => {
            if (!changeInProgress) {
                const newValue = this.fullTextSearch();
                
                changeInProgress = true;
                
                switch (newValue) {
                    case true:
                        this.indexing("Search");
                        this.showAdvancedOptions(true);
                        break;
                    case false:
                        this.indexing("Default");
                        break;
                    case null:
                        if (this.parent().fullTextSearch()) {
                            this.indexing("Search");
                            this.showAdvancedOptions(true);
                        } else {
                            this.indexing("Default");
                        }
                        break;
                }
                
                this.computeAnalyzer();
                this.computeHighlighting();
                
                changeInProgress = false;
            }
        });

        this.highlighting.subscribe(() => {
            if (!changeInProgress) {
                const newValue = this.highlighting();
                const notCorax = this.searchEngine() !== "Corax";

                changeInProgress = true;
                
                if (newValue) {
                    if (notCorax) {
                        this.storage("Yes");
                    }
                    this.indexing("Search");
                    this.termVector("WithPositionsAndOffsets");
                } else if (newValue === null) {
                    if (notCorax) {
                        this.storage(null);
                    }
                    this.indexing(null);
                    this.termVector(null);
                } else {
                    this.indexing("Default");
                    this.termVector("No");
                }
                
                this.computeAnalyzer();
                this.computeFullTextSearch();
                changeInProgress = false;
            }
        });
        
        this.indexing.subscribe(() => {
            if (!changeInProgress) {
                changeInProgress = true;
                this.computeAnalyzer();
                this.computeFullTextSearch();
                this.computeHighlighting();
                changeInProgress = false;
            }
        });

        this.analyzer.subscribe(() => {
            if (!changeInProgress) {
                changeInProgress = true;
                this.computeFullTextSearch();
                this.computeHighlighting();
                changeInProgress = false;
            }
        });
        
        this.storage.subscribe(() => {
            if (!changeInProgress) {
                changeInProgress = true;
                this.computeFullTextSearch();
                this.computeHighlighting();
                changeInProgress = false;
            }
        });

        this.termVector.subscribe(() => {
            if (!changeInProgress) {
                changeInProgress = true;
                this.computeFullTextSearch();
                this.computeHighlighting();
                changeInProgress = false;
            }
        });

        this.indexOrStore = ko.pureComputed(() => !(this.indexing() === "No" && this.effectiveStorage() && this.effectiveStorage().includes("No")));
        this.isStoreField = ko.pureComputed(() => this.effectiveStorage() && this.effectiveStorage().includes("Yes"));

        this.dirtyFlag = new ko.DirtyFlag([
            this.name,
            this.analyzer,
            this.indexing,
            this.storage,
            this.suggestions,
            this.termVector,
            this.hasSpatialOptions,
            this.spatial().dirtyFlag().isDirty
        ], false, jsonUtil.newLineNormalizingHashFunction);

        this.parent.subscribe(() => {
            if (!changeInProgress) {
                changeInProgress = true;
                if (!this.isDefaultFieldOptions()) {
                    this.computeAnalyzer();
                    this.computeFullTextSearch();
                    this.computeHighlighting();
                }
                changeInProgress = false;
            }
        });
        
        this.indexingDropdownOptions = ko.pureComputed(() => {
           return this.analyzerDefinedWithoutIndexing() ? indexFieldOptions.IndexingWithSearchImplied : indexFieldOptions.Indexing;
        });
    }

    private computeFullTextSearch() {
        let fts = false;
        
        switch (this.indexing()) {
            case "Search":
            case "Search (implied)":
                fts = true;
                break;
            // 'Exact', 'No' & 'Default' stay false
            case null:
                if (!this.analyzer() && !this.analyzerPlaceHolder()) {
                    fts = null;
                } else {
                    switch (this.parent().indexing()) {
                        case "Search":
                            fts = true;
                            break;
                        // 'Exact' & 'No' stay false
                        case "Default":
                        case null:
                            if (!this.isDefaultAnalyzer()) {
                                fts = true;
                            }
                            break;
                    }
                }
                break;
        }
        
        this.fullTextSearch(fts);
    }

    private computeHighlighting() {
        this.highlighting(!this.analyzer() && this.analyzerPlaceHolder() &&
                          (this.indexing() === "Search" || this.indexing() === "Search (implied)") &&
                           this.storage() === "Yes" &&
                           this.termVector() === "WithPositionsAndOffsets");
       
        if (this.storage() === null &&
            this.termVector() === null) {
            this.highlighting(null);
        }
    }
    
    public computeAnalyzer() {
        let placeHolder = null;
        const thisIndexing = this.indexing();
        const parentIndexing = this.parent() ? this.parent().indexing() : null;
        const parentAnalyzer = this.parent() ? this.parent()?.analyzer() : null;

        const analyzerConfigurationKey = `Indexing.Analyzers.${thisIndexing === "Default" || thisIndexing === null ? `Default` : `${thisIndexing}.Default`}`;
        
        const databaseAnalyzerSetting = this.databaseIndexConfiguration?.[analyzerConfigurationKey];
        
        const localAnalyzerConfiguration: string | undefined = this.indexLocalConfiguration?.[analyzerConfigurationKey];

        const hasDatabaseDefaultChanged =
            databaseAnalyzerSetting?.effectiveValue() !== databaseAnalyzerSetting?.serverOrDefaultValue();
        
        const configuration = localAnalyzerConfiguration ?? databaseAnalyzerSetting?.effectiveValue();
        
        const isAnalyzerNameInDictionary = this.analyzersNamesDictionary().some((analyzerItem) => analyzerItem.serverName === configuration);


        const currentAnalyzerStudioName = this.analyzersNamesDictionary().find((item) => item.serverName === configuration)?.studioName ?? configuration;
        
        const parentAnalyzerStudioName = this.analyzersNamesDictionary().find((item) => item.serverName === parentAnalyzer)?.studioName ?? parentAnalyzer;
        
        const defaultFieldAnalyzer = !thisIndexing && parentAnalyzer != null ? parentAnalyzerStudioName : currentAnalyzerStudioName;
        
        if (thisIndexing === "No" || (!thisIndexing && parentIndexing === "No")) {
            this.analyzer(null);
        }
        
        this.disabledAnalyzerText("");
        const helpMsg = "To set a different analyzer, select the 'Indexing.Search' option first.";
        
        if (thisIndexing === "Exact" || (!thisIndexing && parentIndexing === "Exact")) {
            if ((localAnalyzerConfiguration || hasDatabaseDefaultChanged) && isAnalyzerNameInDictionary) {
                this.analyzer(defaultFieldAnalyzer);
                placeHolder = defaultFieldAnalyzer;
                this.disabledAnalyzerText(`${defaultFieldAnalyzer} is used when selecting Indexing.Exact. ` + helpMsg);
            } else {
                this.analyzer(null);
                placeHolder = "Keyword Analyzer";
                this.disabledAnalyzerText("KeywordAnalyzer is used when selecting Indexing.Exact. " + helpMsg);
            }
        }

        if (thisIndexing === "Default" || (!thisIndexing && (parentIndexing === "Default" || !parentIndexing))) {
            if ((localAnalyzerConfiguration || hasDatabaseDefaultChanged) && isAnalyzerNameInDictionary) {
                placeHolder = defaultFieldAnalyzer;
                this.analyzer(defaultFieldAnalyzer);
                this.disabledAnalyzerText(`${defaultFieldAnalyzer} is used when selecting Indexing.Default. ` + helpMsg);
            } else {
                this.analyzer(null);
                placeHolder = "LowerCase Keyword Analyzer";
                this.disabledAnalyzerText("LowerCaseKeywordAnalyzer is used when selecting Indexing.Default. " + helpMsg);
            }
        }

        if (thisIndexing === "Search (implied)") {
            this.disabledAnalyzerText("Cannot edit analyzer when Search is implied");
        }

        if (!thisIndexing && parentIndexing === "Search") {
            if ((localAnalyzerConfiguration || hasDatabaseDefaultChanged) && isAnalyzerNameInDictionary) {
                this.analyzer(defaultFieldAnalyzer);
                placeHolder = defaultFieldAnalyzer;
            } else {
                this.analyzer(null);
                placeHolder = this.parent().analyzer() || "Raven Standard Analyzer";
            }
        }

        if (thisIndexing === "Search") {
            if ((localAnalyzerConfiguration || hasDatabaseDefaultChanged) && isAnalyzerNameInDictionary) {
                this.analyzer(defaultFieldAnalyzer);
                placeHolder = defaultFieldAnalyzer;
            } else {
                placeHolder = "Raven Standard Analyzer";
            }
        }
        
        // for issue RavenDB-12607
        if (thisIndexing === "Search (implied)") {
            this.analyzer(this.theAnalyzerThatWasDefinedWithoutIndexing());
        }

        this.analyzerPlaceHolder(placeHolder);

        if (this.analyzer() || (!this.analyzer() && this.analyzerPlaceHolder())) {
            this.showAdvancedOptions(true);
        }
    }
    
    private effectiveComputed<T>(extractor: (field: indexFieldOptions) => T, labelProvider?: (arg: T) => string): KnockoutComputed<string> {
        return ko.pureComputed(() => this.extractEffectiveValue(x => extractor(x), true, labelProvider));
    }

    private defaultComputed<T>(extractor: (field: indexFieldOptions) => T, labelProvider?: (arg: T) => string): KnockoutComputed<string> {
        return ko.pureComputed(() => "Inherit (" + this.parent().extractEffectiveValue(x => extractor(x), false, labelProvider) + ")");
    }

    private extractEffectiveValue<T>(extractor: (field: indexFieldOptions) => T, wrapWithDefault: boolean, labelProvider?: (arg: T) => string): string {
        const candidates: T[] = [];

        let field = this as indexFieldOptions;

        while (field) {
            candidates.push(extractor(field));
            field = field.parent();
        }

        const index = candidates.findIndex(x => !_.isNull(x) && x !== undefined);
        const value = candidates[index];

        const label = labelProvider ? labelProvider(value) : value;

        return (index > 0 && wrapWithDefault) ? "Inherit (" + label + ")" : <any>label;
    }

    private initValidation() {
        if (!this.isDefaultOptions()) {
            this.name.extend({required: true});
        }

        this.indexOrStore.extend({
            validation: [
                {
                    validator: () => this.indexDefinitionHasReduce() || this.indexOrStore(),
                    message: "'Indexing' and 'Store' cannot be set to 'No' at the same time. A field must be either Indexed or Stored."
                }
            ]
        });

        this.validationGroup = ko.validatedObservable({
            name: this.name,
            indexOrStore: this.indexOrStore
        });
    }
    
    static defaultFieldOptions(indexHasReduce: KnockoutObservable<boolean>, engineType: KnockoutObservable<Raven.Client.Documents.Indexes.SearchEngineType>, indexConfiguration?: Raven.Client.Documents.Indexes.IndexConfiguration,
                          databaseIndexConfiguration?: databaseIndexConfigurationType) {
        return new indexFieldOptions(indexFieldOptions.DefaultFieldOptions, indexFieldOptions.getDefaultDto(indexConfiguration, databaseIndexConfiguration), indexHasReduce, engineType,
          indexFieldOptions.globalDefaults(indexHasReduce, engineType, indexConfiguration, databaseIndexConfiguration), indexConfiguration, databaseIndexConfiguration);
    }

    static empty(indexHasReduce: KnockoutObservable<boolean>, engineType: KnockoutObservable<Raven.Client.Documents.Indexes.SearchEngineType>, indexConfiguration?: Raven.Client.Documents.Indexes.IndexConfiguration,
                          databaseIndexConfiguration?: databaseIndexConfigurationType) {
        return new indexFieldOptions("", indexFieldOptions.getDefaultDto(indexConfiguration, databaseIndexConfiguration), indexHasReduce, engineType,
          indexFieldOptions.globalDefaults(indexHasReduce, engineType, indexConfiguration, databaseIndexConfiguration), indexConfiguration, databaseIndexConfiguration);
    }
    
    static globalDefaults(indexHasReduce: KnockoutObservable<boolean>, engineType: KnockoutObservable<Raven.Client.Documents.Indexes.SearchEngineType>, indexConfiguration?: Raven.Client.Documents.Indexes.IndexConfiguration,
                          databaseIndexConfiguration?: databaseIndexConfigurationType) {
        const defaultDto: Raven.Client.Documents.Indexes.IndexFieldOptions = {
            Storage: "No",
            Indexing: "Default",
            Analyzer: "RavenStandardAnalyzer",
            Suggestions: false,
            Spatial: null as Raven.Client.Documents.Indexes.Spatial.SpatialOptions,
            TermVector: "No"
        };
        
        if (databaseIndexConfiguration && typeUtils.isEmpty(indexConfiguration)) {
            defaultDto.Analyzer = databaseIndexConfiguration?.[`Indexing.Analyzers.Default`]?.effectiveValue();
        }
        
        if (!typeUtils.isEmpty(indexConfiguration)) {
            defaultDto.Analyzer = indexConfiguration?.[`Indexing.Analyzers.Default`];
        }
        
        const field = new indexFieldOptions("", defaultDto, indexHasReduce, engineType, undefined, indexConfiguration, databaseIndexConfiguration);
        
        field.fullTextSearch(false);
        field.highlighting(false);

        return field;
    }

    private static getDefaultDto(indexConfiguration?: Raven.Client.Documents.Indexes.IndexConfiguration,
                          databaseIndexConfiguration?: databaseIndexConfigurationType) {
        const defaultDto: Raven.Client.Documents.Indexes.IndexFieldOptions = {
            Storage: null,
            Indexing: "Default",
            Analyzer: null,
            Suggestions: null,
            Spatial: null as Raven.Client.Documents.Indexes.Spatial.SpatialOptions,
            TermVector: null
        }
        
        if (databaseIndexConfiguration && typeUtils.isEmpty(indexConfiguration)) {
            defaultDto.Analyzer = databaseIndexConfiguration?.[`Indexing.Analyzers.Default`]?.effectiveValue();
        }
        
        if (!typeUtils.isEmpty(indexConfiguration)) {
            defaultDto.Analyzer = indexConfiguration?.[`Indexing.Analyzers.Default`];
        }
        
        return defaultDto;
    }

    toggleAdvancedOptions() {
        this.showAdvancedOptions(!this.showAdvancedOptions());
    }

    isDefaultOptions(): boolean {
        return this.name() === indexFieldOptions.DefaultFieldOptions;
    }

    createAnalyzerNameAutocompleter(analyzerName: string): KnockoutComputed<string[]> {
        return ko.pureComputed(() => {
            if (analyzerName) {
                return this.analyzersNames().filter(x => x.toLowerCase().includes(analyzerName.toLowerCase()));
            } else {
                return this.analyzersNames();
            }
        });
    }

    addCustomAnalyzers(customAnalyzers: string[]) {
        const analyzers = this.analyzersNamesDictionary();

        customAnalyzers.forEach(name => {
            if (!this.analyzersNamesDictionary().find(x => x.studioName === name)) {
                const customAnalyzerEntry: analyzerName = { studioName: name, serverName: name };
                analyzers.push(customAnalyzerEntry);
            }
        });
        
        this.analyzersNamesDictionary(analyzers.sort());
    }
    
    toDto(): Raven.Client.Documents.Indexes.IndexFieldOptions {
        let analyzerToSend = null;
        
        if (this.analyzer()) {
            const selectedAnalyzer = this.analyzersNamesDictionary().find(x => x.studioName === this.analyzer());
            analyzerToSend = selectedAnalyzer ? selectedAnalyzer.serverName : this.analyzer();
        }
        
        return {
            Analyzer: analyzerToSend,
            Indexing: this.indexing() === "Search (implied)" ? null : this.indexing() as Raven.Client.Documents.Indexes.FieldIndexing,
            Storage: this.storage(),
            Suggestions: this.suggestions(),
            TermVector: this.termVector(),
            Spatial: this.hasSpatialOptions() ? this.spatial().toDto() : undefined
        }
    }
}

export = indexFieldOptions;
