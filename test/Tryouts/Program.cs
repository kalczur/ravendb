using System;
using System.Diagnostics;
using System.Diagnostics.Tracing;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Tests.Infrastructure;
using Raven.Server.Utils;
using SlowTests.Corax;
using SlowTests.Sharding.Cluster;
using Xunit;
using FastTests.Voron.Util;
using FastTests.Sparrow;
using FastTests.Voron.FixedSize;
using FastTests.Client.Indexing;
using FastTests;
using FastTests.Voron.Graphs;
using Sparrow.Server.Platform;
using SlowTests.Authentication;
using SlowTests.Issues;
using SlowTests.Server.Documents.PeriodicBackup;
using Microsoft.Diagnostics.Tracing.Parsers.MicrosoftAntimalwareEngine;
using NLog;
using RachisTests;
using SlowTests.Server;
using SlowTests.SlowTests.MailingList;

namespace Tryouts;

public static class Program
{
    static Program()
    {
        XunitLogging.RedirectStreams = false;
    }

    public static async Task Main(string[] args)
    {
        Console.WriteLine(Process.GetCurrentProcess().Id);
        var sources = EventSource.GetSources();
        var runtime = sources.FirstOrDefault(x => x.Name == "System.Runtime");
        runtime?.Dispose();
        for (int i = 0; i < 2; i++)
        {
            Console.WriteLine($"Starting to run {i}");

            try
            {
                using (var testOutputHelper = new ConsoleTestOutputHelper())
                using (var test = new BasicGraphs(testOutputHelper))
                {
                    DebuggerAttachedTimeout.DisableLongTimespan = true;

                    test.BasicSearch();
                }
            }
            catch (Exception e)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine(e);
                Console.ForegroundColor = ConsoleColor.White;
            }
        }
    }

    private static void TryRemoveDatabasesFolder()
    {
        var p = System.AppDomain.CurrentDomain.BaseDirectory;
        var dbPath = Path.Combine(p, "Databases");
        if (Directory.Exists(dbPath))
        {
            try
            {
                Directory.Delete(dbPath, true);
                Assert.False(Directory.Exists(dbPath), "Directory.Exists(dbPath)");
            }
            catch
            {
                Console.WriteLine($"Could not remove Databases folder on path '{dbPath}'");
            }
        }
    }
}
