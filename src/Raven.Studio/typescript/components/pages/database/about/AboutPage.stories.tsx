import { withBootstrap5, withStorybookContexts } from "test/storybookTestUtils";
import { Meta } from "@storybook/react";
import { AboutPage } from "./AboutPage";
import React from "react";
import database from "models/resources/database";
import { boundCopy } from "components/utils/common";

export default {
    title: "Pages/About page",
    component: AboutPage,
    decorators: [withStorybookContexts, withBootstrap5],
    // excludeStories: /Template$/,
} satisfies Meta<typeof AboutPage>;

export const AboutTemplate = (args: { db: database; stats?: IndexStats[] }) => {
    return <AboutPage />;
};

// export const StatsSingleNode = boundCopy(StatisticsTemplate, {
//     db: DatabasesStubs.nonShardedSingleNodeDatabase(),
// });

// export const StatsSharded = boundCopy(StatisticsTemplate, {
//     db: DatabasesStubs.shardedDatabase(),
// });

// export const FaultySupport = boundCopy(StatisticsTemplate, {
//     db: DatabasesStubs.shardedDatabase(),
//     stats: IndexesStubs.getSampleStats().map((x) => {
//         x.Type = "Faulty";
//         return x;
//     }),
// });