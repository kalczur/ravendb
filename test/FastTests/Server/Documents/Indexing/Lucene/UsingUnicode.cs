﻿using System.Threading.Tasks;
using Raven.Client.Documents;
using Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace FastTests.Server.Documents.Indexing.Lucene
{
    public class UsingUnicode : RavenTestBase
    {
        public UsingUnicode(ITestOutputHelper output) : base(output)
        {
        }

        [RavenTheory(RavenTestCategory.Querying)]
        [RavenData("לְשֵׁם יִחוּד קֻדְשָׁא בְּרִיךְ הוּא וּשְׁכִינְתֵּהּ", SearchEngineMode = RavenSearchEngineMode.All, DatabaseMode = RavenDatabaseMode.All)]
        [RavenData("Оптиматика", SearchEngineMode = RavenSearchEngineMode.All, DatabaseMode = RavenDatabaseMode.All)]
        public async Task TextEnteredShouldNotBeNormalized(Options options, string content)
        {
            using (var store = GetDocumentStore(options))
            {
                using (var session = store.OpenAsyncSession())
                {
                    await session.StoreAsync(new UnicodeItem { Content = content, Id = "item/1" });
                    await session.StoreAsync(new UnicodeItem { Content = content, Id = "item/2" });
                    await session.SaveChangesAsync();
                }

                using (var session = store.OpenAsyncSession())
                {
                    var result = await session.Query<UnicodeItem>()
                        .Customize(customization => customization.WaitForNonStaleResults())
                        .CountAsync(item => item.Content == content);

                    Assert.Equal(2, result);
                }
            }
        }

        private class UnicodeItem
        {
            public string Id { get; set; }
            public string Content { get; set; }
        }
    }
}
