const lodash = require("lodash");
const knockout = require("knockout");
require("knockout-postbox");
const jquery = require("jquery");
const ROP = require("@juggle/resize-observer")

global._ = lodash;
global.ko = knockout;
global.$ = jquery;
global.jQuery = jquery;

require("bootstrap/dist/js/bootstrap");

require("../typescript/test/mocks");

// Add custom Yup methods manually to avoid importing setup file
const yup = require("yup");

// Basic URL regex pattern
const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

yup.addMethod(yup.string, "basicUrl", function (msg = "Invalid URL") {
    return this.matches(urlRegex, msg);
});

yup.addMethod(yup.string, "base64", function (msg = "Invalid base64") {
    return this.matches(/^[A-Za-z0-9+/]*={0,2}$/, msg);
});

const customHooks = require("../typescript/components/hooks/hooksForAutoMock.json").hooks;

customHooks.forEach(hook => {
    jest.mock("hooks/" + hook);
});

jest.mock("../typescript/common/eventsCollector");
jest.mock("../typescript/common/bindingHelpers/aceEditorBindingHandler");

jest.mock("../typescript/common/versionProvider");

jest.mock('plugins/router', () => ({
    activate: jest.fn(),
    navigate: jest.fn()
}));
jest.mock('plugins/dialog', () => ({
}));
jest.mock('durandal/app', () => ({
}));

const ace = require("ace-builds/src-noconflict/ace");
ace.config.set("basePath", "../node_modules/ace-builds/src-noconflict");
window.ace = ace;

window.Worker = class Worker {
    constructor(stringUrl) {
      this.url = stringUrl;
    }

    onmessage = () => null;
    postMessage = () => null;
    terminate = () => null;
}

// Mock studioSettings comprehensively
jest.mock("common/settings/studioSettings", () => ({
    default: {
        configureLoaders: jest.fn(),
        init: jest.fn(),
        getValue: jest.fn(() => null),
        setValue: jest.fn(),
        globalSettings: jest.fn(() => Promise.resolve({
            environment: { getValue: jest.fn(() => "Development") },
            replicationFactor: { getValue: jest.fn(() => 1) },
            collapseDocsWhenOpening: { getValue: jest.fn(() => false) },
            disableAutoIndexCreation: { getValue: jest.fn(() => false) },
            disableStudioAnalytics: { getValue: jest.fn(() => false) },
            sendUsageStats: { getValue: jest.fn(() => false) }
        })),
        databaseSettings: jest.fn(() => ({})),
        environment: jest.fn(() => ({}))
    }
}));

const studioSettings = require("common/settings/studioSettings");
const mockJQueryPromise = () => $().promise();
studioSettings.default.configureLoaders(mockJQueryPromise, mockJQueryPromise, mockJQueryPromise, mockJQueryPromise);

Storage.prototype.getObject = jest.fn(() => null);

global.define = function() {};

Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    value: 500,
});

Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    value: 500,
});

Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    value: 500,
});

if (!window.ResizeObserver) {
  window.ResizeObserver = ROP.ResizeObserver;
}
