import React from "react";
import { ComponentMeta, ComponentStory } from "@storybook/react";
import { withStorybookContexts, withBootstrap5 } from "test/storybookTestUtils";
import StudioDatabaseConfiguration from "./StudioDatabaseConfiguration";
import { DatabasesStubs } from "test/stubs/DatabasesStubs";
import { mockStore } from "test/mocks/store/MockStore";

export default {
    title: "Pages/Database/Settings/Studio Configuration",
    component: StudioDatabaseConfiguration,
    decorators: [withStorybookContexts, withBootstrap5],
} as ComponentMeta<typeof StudioDatabaseConfiguration>;

export const StudioConfiguration: ComponentStory<typeof StudioDatabaseConfiguration> = () => {
    const { license } = mockStore;
    license.with_License();

    return <StudioDatabaseConfiguration db={DatabasesStubs.nonShardedClusterDatabase()} />;
};

export const LicenseRestricted: ComponentStory<typeof StudioDatabaseConfiguration> = () => {
    const { license } = mockStore;
    license.with_License({ Type: "Community" });

    return <StudioDatabaseConfiguration db={DatabasesStubs.nonShardedClusterDatabase()} />;
};
