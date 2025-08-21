using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using FastTests;
using Newtonsoft.Json;
using Raven.Client.Documents.Conventions;
using Raven.Client.Documents.Operations;
using Raven.Client.Documents.Operations.AI;
using Raven.Client.Documents.Operations.ConnectionStrings;
using Raven.Client.Http;
using Raven.Client.Json;
using Raven.Client.Json.Serialization;
using Raven.Client.Util;
using Raven.Server.Documents.ETL.Providers.AI;
using Raven.Server.Documents.ETL.Providers.AI.GenAi;
using Raven.Server.Documents.ETL.Providers.AI.GenAi.Test;
using Raven.Server.ServerWide.Context;
using Sparrow.Json;
using Tests.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace SlowTests.Server.Documents.AI.GenAi;

public class RavenDB_24648(ITestOutputHelper output) : RavenTestBase(output)
{
    private const string HeartPngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGHaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8P3hwYWNrZXQgYmVnaW49J++7vycgaWQ9J1c1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCc/Pg0KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyI+PHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj48cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0idXVpZDpmYWY1YmRkNS1iYTNkLTExZGEtYWQzMS1kMzNkNzUxODJmMWIiIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIj48dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPjwvcmRmOkRlc2NyaXB0aW9uPjwvcmRmOlJERj48L3g6eG1wbWV0YT4NCjw/eHBhY2tldCBlbmQ9J3cnPz4slJgLAAAA1ElEQVRYR+2WORLDIAxF5Rwhvcvc/0Ap0+cKpMID4gtJmK3IqzwYfb2Rl+EIIQRayIMvzObQJvA9X9f18/PO7kl4akSBNATBg737I1BAC4vEUOt+AiKFgCesBS6QvYSjmxPosfwruAS42UjSXvtMYBV/gX0E+A9iJGmvfSawikxgxmPgPfaaAAHDnqDsQmA2UACZ3kXKhAJUKWihliUKkFJoRcuoCpAhoIalVhUgYxDHWmMSIEcgOfcWp2IL0vHN0zhinkAKaoTWLDRNoCdNE+jJcoEf1VNdHhBR9pYAAAAASUVORK5CYII=";

    private const string StarPngBase64 =
        "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";

    private const string BananaPngBase64 =
        "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAYXUlEQVR4nOycCbBkZXn3/8/zntPbvXNnYWAsEB3AEUZgAFFcyg+Fj0+kQPwQ0aJSBCxEkFARkxDFNVapSBZJadTERGMiUBpQVkshRlET2QzLMOCIYA2Dss/CXfp293nf90m92znn3hkBma2N/QyH09339OnTz+991vc9zRjJUMkIyJDJCMiQyQjIkMkIyJDJCMiQyQjIkMkIyJDJCMiQyQjIkMkIyJDJCMiQyQjIkMkIyJDJCMiQyQjIkMkIyJDJCMiQyQjIkMkIyE6U+35y4oKHbn8NPdMxz/jHkWw/ufu2Y/d64MFfrW9T4/sL2xOXtMZa3z/8mBt684/Lds3l/f5JV3f363GfN01PHoOcXtvfZFbfePn//UfbaP1UFJsX7Db5wGFH/rA/ArKTRGBfbozBTG+Ax2emOksXZa8eG2u+2kBDYB6D4CAA/VEM2Qmyfs3JJDDHGi1oNnM0mk1oEHqs0ZfJdWInTzzs9T/cgJHL2jkyUIPFQjiUFaHTbiHLGESC/mBGRBcXnvDWu29Px46A7ASxbFYopZa1Wk0QKZBzYHaAol/c0Ga6pn7sCMjOEOYjBUTtdhNai09uxQog9tsnvu1ns3MO3XVX+fshv/7FKWytnO3ih+IMihUypXyYbyi+ef7xIyA7WAZKH9EbFPsVhYGIMxaGUuwLwEXNxv3zjx8B2YHy0P0nUV8Xp3S7PQwGugRCRMgzevqoN985Nf89oxiyA2WA4oBev/+H3dk+nIW48U8EKEUg4V9u7T0jIDtQeoPBO2emZ5f2egNYKx5EcFmAYp7c2ntGQHaQ3HvvsYfMzPZOn57poSgsyEUN9x85t0XImLbaRxzFkB0kRaH/stvt7dGbHcCakOo6BgEIkDGWbO19IwvZzrJ29XFO7xd1+/03mkIg1tsGFFO5RdvYe2vvH1nIdpZc5Rcqys5vqSYmmh0s7HQw0W5hotPERKuBTpahyeysZeLm774yn//+kYVsJ3lgzZubTPwXAH2ASUCssLDdxljeAJGFIoEigrEWA2MwMKA+zF4A1tXPMwKyHWTdfSeNAfRpEL3HFxvWugTXZ1SNBkE5IP51gXHh3QDFrIXp2T3nAxm5rG2UdfedPMGc/YPi7DxF7AzBK97tnXIzZxni6g4CuXhiAWUJShNQ0D7zzzeykG2Qh+97+2JS6jIiPs5ZhrUaSEAgyFyaK24L1uF27u9MLtYQmjmvnH/OLXLhL334dWP7rdp03Ph4prMse6SV5Q8dePQtj++0b/k7Io+sPXUPIvU1YvVGp2VjNKwpYHUBiPEw2BqwpwDf3XWbtRZGi69Nej19rbHytlXH/7hI551jIX/7vtNe3B9s/GqWT73BiIA5Q48U7vzhkY8ppp+S0GWK6aaFKn98r9fcKLtAD0Mhj689/YWk1JXM6lVWrAfh4gaM8dbggrcSE+KBy3F9GSJ++LucWFwd4iykwauMld0d33Tu0kK+/tcX/smmzT9/17IX3b1y6dIMrbEFaDTbyPImmJXPGtyZRewGEruaIVc0wV9d/pobZ3eVYnaFPLn29CWcN/+DWR0q4iyjgNZ9GN2DGO2zqQwWJDa8IXCAWAvxbk1gjfV7XVhtrD1sv6NvWpPOX1rI5NObT+sXD6+cmlqPTnsZxhYsQbM55oEolYOYwtlFdoPYo0TMUQL76fV3HP8tEF3ZtNmNyw6/utg1ato5svH+dy/nLLuGVLbKBQRtXRWuId5CDHKGz6bIG0awDHGWIfE5qtaJez8rp3/avf4ZHsgnz3rrxBOPPbLvomUbPMmZ6c1Y1F+MfPEyNNvjUCqLlheDk0ve3AgQmQDkDMC+w4rc/Njqk7/a0PmlS17+9f917mzzz8/Zl/OGg3FQiNtF0IXRAYZzU84yUPvqPqiHgSwRBgVafoCTcUdLp/45Hog2Gz+x38semZhY9ASMzh059GY3oj+7CGMLFqPR7IAY3uTEgfDm54FEn0dtIhwt1h5trf3QU2vP+GcY+7WlB/7rIztbcdtbNq85q6HanXMoUx+nTC1yr7nA7MemDa4ph9NDGKReH55BBSL0FclnWRRjCXmoAm3snM/zQF71+kds3pyCmJZ/g4sZecbodzdgdrKDxtLlYNWKLgseRAASHvuPc8TI59v7Q+RTYuXMzQ+e9xUx9vLFL/3C+l2izW2Qp9e8m1WrcziUej9l6i2k2OtKxHiLgCnAdgASHWAEvxTfnQIHqn0UQgVKG5dtyUz9c/2HdNr2B+DGeznPAhDFyFzcEIve9BPIFWNs8d5QzTbSECDh8rP9aCD2UBjKt9IAXgHBRdaasyfXfeCLKPr/MrHikt+J9Hlq7Xl7cLN5PlT2LsrU7m6s+UFoDUQXkGLWb6R7gAMiCUbS/FY66yQVGwrexgX1QtsN9cM8kGKyc21zcfeJTMke7sNd0GGnYJAPWr3pJ8G2QHvRXlDtCRBz/OjgFMkleP54ByUD+ViV+8cKarkILpaG/tTMrz75RRH7Dej+3eP7fGKL6ctdKZOrzyRud5aTys4ilf0R5Y2J8D396hCI1bBFH3YwC+OAmIGvN4LqeSvmMP95zXrCKWGsPKS1PFW/jhLlf1750q/kOd6pOAWfNLvl3FeOZt5Eqz2G5tgSqM5uQN6MpplAqAjDgcjB1CihBO4K4ixJrBFrHoboy8T0rtIb1t0xseqLuywJmFx9JlOrfRhn+Qcoy99EmRr3KX4c8cEqBpCiBzOYhdWDUHc4jZLEIC7RDUlNqxKsKu7DISn1tSj6GlMzxTUzXX3K4Sf9pMxOKyBX7H9UnuHaLKNxjt6IKMSGTCk08gZazSayLIfKm8g6u0F1lgAqC1biYFAGpiaYWmBugDyUCkh4rOAroxDWILaYguhbxfSuhdU/sHrmYTP96OSClZ/dYZCm1p47TkodAKXeQUqdSirbi5SKcTDFSBe1tQfh3JO3Dq29MgUBhEQQIX7Mg5IgpX5JPKffjEEx0Oj29J+tOOZHf1O/trIOMX3+ca7kJghOmHNODiW/MQZaa69IX/4XjyLrTSIfWwpuLQSpBNAVkZmHQdyoYDgL8dbkDlTxNZf+dRZA7DGi9DGQQnNj0WOqtcev+k9+6X6Y/s9E9J16+vE7x1d8+onnC2ByzbtzajRewVn2/8DqcGI6BKz2JKVySrmohLHpLMKD0H2g6Pu91YUv5iQlMPG8VKo/WkEK5giZk6S2iUgNsg1tFFeHEP59/rXOiT63XrnyOJXJ1UpRg+J0I3mlJdeVIcvCYi+/nIVD8M+a48g6S6Bai6AaC8FqHMztYCEuOZHMw/CW4WFk0e/WEgP/pUzIYmB8sPSPRfvXYQuXjawXMZuI6FGx2jnyzSD7lNgeYJ1PLyCwSqxZQoTdQLwMRHsDtC8xs7cALouByrV4JdkShIfh99pX1BIbgyEgJxdlI45QewTl2/KcyTLKGCRVL8tZWqHNj4rCvOElx/yXbNVCwujATVbjm4pwarBeCqM+djCNz5lt+FJ+KYtAeyVOw5oBst5mSHMRVHMJqLkEyCZAaEY3kNXGgMwdE9FNlIoSiiNRyi8NojHArKT0nNOoNL5GQnQe/l/pRqNrjPvy9FIHYUKl7QEMwuaqb6/ANPDrAbmKGVXssNXzWtwIHxPdlANhjbc0rXUhVj4zH8YWFuLktn9beajKcFuWcR4Ce4DivpTPvlh5C3EWw5yBVXge9gzlLEg1oPIOVHMx2MHJnUtr+yAvlMdgn8fxQFuxEFf9FhBXDZebjpZjgwLSiESwIHF/S5UyVRBKCmkoSM0aTOEBwAxCOuvg2AAi6LICIagswyuZbHUt5fXInGMl1mnWn9f6jrDRzvWb7wjw9v2OuXn6WYE4+ekVB3wwy/gTKmPyQJCAxFojwlDlPvOgXP2S3Jl77JuSylX+bXC+wINBNgYoV/m3Y4xRiG2A+MV0dFduP4ibLl2X1L882SpoIlXJKd2sfTWJBZ0xPn31FuFg+D6U9oq1Nh03XyVzXY93VRLaR9XgqFlIfI/1bgrRMjSsMR5GURgtYo9c8abbt1jXi980QUWgz0HkFFg51D9TaYQFN+Bnv9wLNoxAKasd95ghliFEzsv54lLsrHdp1J8EqQZItUBZB1DtCozPClLlH6xBSsvQob2NNCJRuQ+pFOH/b6XWUTDRGhIIHR9HK0luqbTS+VLPlEK7KFhwtY9ar1lQLZtyViEWRmvv7ovCJQfydwcc/99bhfEbLcTJXd9aub9ivoWZFrnRTqkSj+6JKYuWErIqViHYE4fXfGEZVleE1j1xdH0hywqZmPJB3//dvZdU1YGLcKgWPJFCTd2F1KGILQNoig+QuvKjcqPypT6otyBiq3gAG9vnpnSrUlqLrVlQ2NcDuPGWoaFdqqvtWhBed+AJd274rYE4WXP1y94K4BusOOOoMK/kCEJFEEzBdVGKKxzdlQcSqvgKCMc1rrV9CSG5x6rAKjsSJPN0F0ejTdqNriOll1Hx5eN0CGon2SoMqUY9pWaqCfElxTgx3iUF+BWQ8FFV8ZeAFNo4C+kba49Y9f/vWf1MOn/mOXWhq8C4QASfEbGUskTvqtzYJeMn7oWD7/WPnauJGQ/83UNpfgCIB4aR5Y3AhnS4lttLVHzqmkpt3AjmdiAqy0DNtaAEULl0mlOyzfX3dRA2ns5WXW0PIqTgrqCbA8RlTck9xevwscNlpH4Lf3cwLOgPng3GswI56KR75Z6rD/wcEZZbi/eSSjl1cOlcGXQqvP1rNo5KFleVO3dkgpI4BV+OI9BBtCEOoVZEUb09SnOzpdRRrY1ukRqEGqASFGqpbnnM3OPLuqEc+VHxLvZYHRKC8rmNj5MbtPEzwne3EYh1/8T3rN5HzN96Nhh4rj8csPraA3NFfBGB/tTPeKWMi2NWRTGWqODWgtuKr/lYEtwXMZe1QX0GjaJCqkxGanPRyd2pKpUtL53mxJZ5D2q1QAUGc2IP5mZQfrSbspkYNhNmBa2J2ZIukwLvlqQqHH3KEb9LAIIZIXzw0Lfd99nnomc812VAq068t7j3+kM+JOKGO50jQMuZJtugDonVq8uomN1FGm8ZYkPAZhdcPZCs7I+lgV6mqnFkUiyy3JcK8SW0XEAxCUBVX2wZU7aifJGK0ZysCXPjhcQ6KMWLCMP46j2A8NZhjE9hpWYJPoBH+FbiRtgIpg9xlv3Tc4WB3/anNdZcd3BOoAuI6CNE1PJhmYOCOQbteoZFKREgVVkJcQmEYjXuu6ZlGmnKUY/U++IsNCZZlZBCrkVVOKAqfkjqM0n1fMvUqt7ws3OCt41WYV1x6pTv09XwmosLRkcL8VAQXFe86jCcaANl6p3I82+/4pQ1docBSXLPdQefQKAvE2gPTq16vw+uLKS6CVIEgwglvZZaGalbiuCz/RyD1ID4tDgPUFKqnDKz6LbmKDztrcxzU2WhUqXOsVZI9YXv5CZLSFbhQLjHcXP1hImrRpJ1SAUCUHQHsuzUV532iy3uH9xhQJysvv6QFYBcToJXxCkqJDgBEJf303FpGdFKEP7uL0Aqt+H7Ur4QlAqIyjwU+JUvWahhalDm1iVVv7AK5lUKXX1OLT31liGVq0oQfJvDQQhATBHaHjYCManWSDUokRFWl1EjO/e1Zzww83z1uk2/BnT3dQcrCD4C4AIGOhBUN6XEmiL1wirr4RKav4kl+XEb6wgXb5Jymb1VuFrHA/FwgssKs5RzavTqy5QJQszefD1BVcJQq1WsTTOCITakbqyvriMM7fcmtj8qC7ExPxem9VDZOf/n7Ie+sy36xPb4eaY7r1nlhulhAD4P4NUU164Swp1CHDOqCkycHuaYZcW1rxRHapVloXJ3Krorlap8rrXP59UmKY2dX3eUf6vS3DJ+eFdl/a0C1hdxxluEf5y2GDusA2LLQtCS4ouR55e8/ux1T26rLrE9fy/rtm8e3CTCWyD4MAEH+ZqcqukHVVpOjDnlfHwCUqWeqVVO8f4vn0779gqXTU7vqIiqknFOnTe3qk9WVLZNUovDxpWENvadjAmjP0HR0SKKylU5gNYFHKJrwerio897+NbtpUPsiB8wu+WKg14ggjMA+XMCFicoHN2Y31I4TpNgMQ6QVDV+SIdD1xhh5UUgXLZg6uYhc1d1JFcl84AAc6zDlt3Y1HeyAYBOYMJz77LccUbcqdcpxgWk1HeOPveh5x0rfpNsNyDfvvQ870NCgUeYUD9eCugzCHI6QQ5kSi4srmpJ0xZIgEK2RXVPFF0cRRh+AoqjVdA8f1UDIjVrEalNpdY6wjb2tjyIOPlmdVi4Zksw8XXjew93gejzqrXg6/3x47oOzmDQxQ3fvwdfvvxHW+0VPx/ZLkCuDzBqvQ32y+2czlty1x4sm46HFCcT7BFMWMBxJpUjAK7V3cmtVW4rLr1MiUCEmK5c4rpZKW1lbj0SrCWFDimbw8lCfPpqqk1r8ZahjXdlUxDcQZRdys3dv2sXvHKjn4TxNxnkYkXZfkGyYdOkrFu3Xv7qc1dtM5htAnL9pX+c9BgnyENvXcBuywRZZt1jyTNjkTX0rUco2XgsyezrmIqXODAKYXQzqq57mT6nWqU2nfxsV1z1F+dVJ7GCBkJCFypqCYsQHQgHRAco1vKjoOb3OF9yQzZx0O3MjT75ppsrlEgDZASZtsi1RdNYyfVsT9vTzvrob1UEbk2eN5DrLj0/Dei4hIQaArgKringhttbqJZANaxkTWO54TZtqDEopIXiwf2b8uAbMky+NKP+bkrpdn0qJMWcZAx1GJQsqB4XaopH+VqsUIQqq4jH+F6Tz7Jd7OCiMGqjkc4DyPf+Xja24t5mrgaZkkKx1Ux2QLAD8nv0AfQEqm+R9yyafSP5wEijWLdunX3/R7+wTVCe/y1tlPmee7qVzgEB0BJw220Ad4CsI6La4sFwS5wH85u0+na5bOzteevsbO+eor9pCZknXzCWP/misebU7q28GG/mplG6r9Ji0mfXl0pItYRHYr1Rc2cpsSrbG7GrPjvg7my/uWG6v+gBjWW/bHaWPj4+NjY7nuUDJfxCK1SIyEBAhYB6APUB6gK2C5AL5jMx7hnFbKyxZsmSpdtsIc8biPi32qo/Hhx5jB0hSki8GVj8EhV/s3AsPqyA2BB44GoNbTtmprv79K+7nV/PzHTHut1uy+qZTivvjrfyfnvhWDE2MW7HxlrSauTImSl2aIQp3YgRsmexIqHg9tmrmP5A9PSMzG6akpmNk+rpbi+f6g7GN7bbC6YnJhZ0Fy9a0F04MT7bQF642GCFYX10Y9+9Zb+goTaD5oeIRPukmj1SOQe0S4AYm9ohFHoegiJAcBfGWsADQDnT9i5MxE+cNwSSA8iFOCOmjJkVMWfMlCtWDWZqK+bWwGaNpzbn+WBg1WAgXBQFG2OIYJRiy4qFQdblXmytOBBk/BIbK4NCbH9gjdsXBWmlMskbuWm2WkWnzcWCce4xcz9txFwQKQ1iDbeHMgJo79kgmoQGIC4A2wfEbT0AswD3BDQwVlweZp968qldB+Sk0z4lV136MW+iIaEhC3Jm7kxbVYGdlBJxAd5PbymJwZ9gmVgxkePhxD0m5V9kUopJ+ReZlVIupIbRaYzQoIgzcgZkY8oaNvHVdogPIjEDS91LS4AhIsOKNTMbpZRht7GyRGxByoq/B0pZ680YJjR1rGFXhYg1RKIJ0NavviAtUG7wWV0U9oMf//yuc1lOJqd6aLfbNs9zMdZaBmtrMSCVsQiRFfZLVqx1ZYdzXeGGbUruy//dccjCPjQhy9CeCvpwXxCVjeE5k39eUr0+b+p27jP3wULEYWMlzCzMyj8Ocy0qTmsqP8lj/QUjvmbF/1Ki+L07l5+W0lrbTZs3ydnnX7JdapFtAnL6ey72F3HRx87EnnvuJZ2xMWzYtBmKM2qPjaHQGq1WhwaF8cWdezzb60NlBFX4hJgyZdFqEWZmunBW4BuJxLFGgK+OoxWQNrX2RlpEECtoU2+DhEpcpJxrR1npxKamKMV+4ThzWKyn8qbkjZYfC81WR7rdabSauV/clmWMfq8vShFarQb0YCD9QR+TTz+N917499utKMSOaJ08m+zz4mW+Q8Jxwd2++70E7zn3XNz43RswNT2F3uwser0eer1ZzPZmnSIwGPT8mibt5yNMvCc8tM79Ha0SK2pfV0i58CABUCpDo9FAq9VCu9PBgvFxLN9nOTrtNm679RaE1f7xZv+Mcdc9D25XJY/kd1hGv3UyZDICMmQyAjJkMgIyZDICMmQyAjJkMgIyZDICMmQyAjJkMgIyZDICMmQyAjJkMgIyZDICMmQyAjJkMgIyZDICMmQyAjJk8j8BAAD//+LLZQ8hUG/+AAAAAElFTkSuQmCC";

    private const string NonEmptyAnswerHint =
        " ;Always provide a valid structured response matching the schema (if you have no answer or an empty answer - please return default values instead)";

    private class Post
    {
        public string Content { get; set; }
        public Comment[] Comments { get; set; }
        public Post(){ }
        public Post(string content, Comment[] comments)
        {
            Content = content;
            Comments = comments;
        }

        public override bool Equals(object obj)
        {
            if (obj is not Post other)
                return false;

            if (Content != other.Content)
                return false;

            if (Comments == other.Comments)
                return true;

            if (Comments == null || other.Comments == null || Comments.Length != other.Comments.Length)
                return false;

            for (int i = 0; i < Comments.Length; i++)
            {
                if (!Equals(Comments[i], other.Comments[i]))
                    return false;
            }

            return true;
        }

        public override int GetHashCode()
        {
            int hash = Content?.GetHashCode() ?? 0;
            if (Comments != null)
            {
                foreach (var comment in Comments)
                    hash = HashCode.Combine(hash, comment?.GetHashCode() ?? 0);
            }

            return hash;
        }
    }

    private class Comment
    {
        public string Id { get; set; }
        public string Author { get; set; }
        public string Content { get; set; }
        public string AuthorDescription { get; set; }
        public string ProfileImage { get; set; }

        public Comment() { }

        public Comment(string id, string author, string content, string authorDescription, string profileImage)
        {
            Id = id;
            Author = author;
            Content = content;
            AuthorDescription = authorDescription;
            ProfileImage = profileImage;
        }


        public override bool Equals(object obj)
        {
            return obj is Comment other &&
                   Id == other.Id &&
                   Author == other.Author &&
                   Content == other.Content &&
                   AuthorDescription == other.AuthorDescription &&
                   ProfileImage == other.ProfileImage;
        }

        public override int GetHashCode()
        {
            return HashCode.Combine(Id, Author, Content, AuthorDescription, ProfileImage);
        }


    }


    [RavenTheory(RavenTestCategory.Ai)]
    [RavenGenAiData(IntegrationType = RavenAiIntegration.OpenAi, DatabaseMode = RavenDatabaseMode.Single, CheckCanConnect = false, NightlyBuildRequired = false)]
    public async Task GenAiTestModeWithAttachments(Options options, GenAiConfiguration config)
    {
        using var store = GetDocumentStore(options);
        await store.Maintenance.SendAsync(new PutConnectionStringOperation<AiConnectionString>(config.Connection));

        config.Prompt = "Describe the following images." + NonEmptyAnswerHint;
        config.Collection = "Posts";
        config.SampleObject = JsonConvert.SerializeObject(
            new { PhotoDescription = "Description of the photo" });

        config.UpdateScript = @"    
const comment = this.Comments.find(c => c.Id == $input.Id);
comment.AuthorDescription = $output.PhotoDescription;
";

        config.GenAiTransformation = new GenAiTransformation
        {
            Script = @"
for(const comment of this.Comments)
{
    let img = loadAttachment(comment.ProfileImage);
    if(!img)
        continue;
    ai.genContext({Id: comment.Id}).withPng(img);
}"
        };

        var marker = "None" + Guid.NewGuid();
        var post1 = new Post("Hello World!",
            new Comment[]
            {
                new Comment(id: "Comment1", author: "Shahar Heart", authorDescription: marker, content: "Hey!", profileImage: "heart.png"),
                new Comment(id: "Comment2", author: "Omer Star", authorDescription: marker, content: "Hello!", profileImage: "star.png"),
                new Comment(id: "Comment3", author: "Aviv Rachmany", authorDescription: marker, content: "Hello", profileImage: "none.png")
            });

        using (var session = store.OpenAsyncSession())
        {
            await session.StoreAsync(post1, "Post/1");

            using var heart = new MemoryStream(Convert.FromBase64String(HeartPngBase64));
            using var star = new MemoryStream(Convert.FromBase64String(StarPngBase64));

            session.Advanced.Attachments.Store("Post/1", "heart.png", heart);
            session.Advanced.Attachments.Store("Post/1", "star.png", star);

            await session.SaveChangesAsync();
        }

        var database = await GetDocumentDatabaseInstanceFor(store);
        using var _ = database.DocumentsStorage.ContextPool.AllocateOperationContext(out DocumentsOperationContext context);

        // Stage 1 : Create Gen Ai Contexts
        // test-doc (sending new doc - doesn't exist)
        var document = store.Conventions.Serialization.DefaultConverter.ToBlittable(post1, context);
        var createCtx2 = await store.Maintenance.SendAsync(context, new TestCreateGenAiContextOperation(document, config));
        Assert.Equal(0, createCtx2.Results.Count);


        // Existing doc with attachments
        var createCtx = await store.Maintenance.SendAsync(context, new TestCreateGenAiContextOperation("Post/1", config));
        var genAiContexts = createCtx.Results;
        Assert.Equal(2, genAiContexts.Count);
        Assert.NotNull(genAiContexts[0].ContextOutput.Context);
        Assert.NotNull(genAiContexts[1].ContextOutput.Context);
        Assert.Equal(1, genAiContexts[0].ContextOutput.Attachments.Count);
        Assert.Equal(1, genAiContexts[1].ContextOutput.Attachments.Count);
        Assert.Equal("heart.png", genAiContexts[0].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal("star.png", genAiContexts[1].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal("image/png", genAiContexts[0].ContextOutput.Attachments.FirstOrDefault()?.Type);
        Assert.Equal("image/png", genAiContexts[1].ContextOutput.Attachments.FirstOrDefault()?.Type);
        Assert.NotNull(genAiContexts[0].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        Assert.NotNull(genAiContexts[1].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);

        // Stage 2 : Send to model
        var sendToModel = await store.Maintenance.SendAsync(context, new TestGenAiSendToModelOperation(genAiContexts, config));
        var contextsAndOutputs = sendToModel.Results;
        Assert.Equal(2, contextsAndOutputs.Count);
        Assert.NotNull(contextsAndOutputs[0].ContextOutput.Context);
        Assert.NotNull(contextsAndOutputs[1].ContextOutput.Context);
        Assert.Equal(1, contextsAndOutputs[0].ContextOutput.Attachments.Count);
        Assert.Equal(1, contextsAndOutputs[1].ContextOutput.Attachments.Count);
        Assert.Equal("heart.png", contextsAndOutputs[0].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal("star.png", contextsAndOutputs[1].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.NotNull(contextsAndOutputs[0].ModelOutput?.Output);
        Assert.NotNull(contextsAndOutputs[1].ModelOutput?.Output);
        
        // Stage 3 : Update Script
        // doc id
        var updateScriptRes = await store.Maintenance.SendAsync(context, new TestGenAiUpdateScriptOperation("Post/1", contextsAndOutputs, config));
        var inputDoc = ToPost(updateScriptRes.InputDocument);
        Assert.Equal(post1, inputDoc);
        var outputDoc = ToPost(updateScriptRes.OutputDocument);
        Assert.NotEqual(marker, outputDoc.Comments[0].AuthorDescription);
        Assert.NotEqual(marker, outputDoc.Comments[1].AuthorDescription);
        outputDoc.Comments[0].AuthorDescription = marker;
        outputDoc.Comments[1].AuthorDescription = marker;
        Assert.Equal(post1, outputDoc);
        
        // doc
        updateScriptRes = await store.Maintenance.SendAsync(context, new TestGenAiUpdateScriptOperation(document, contextsAndOutputs, config));
        inputDoc = ToPost(updateScriptRes.InputDocument);
        Assert.Equal(post1, inputDoc);
        outputDoc = ToPost(updateScriptRes.OutputDocument);
        Assert.NotEqual(marker, outputDoc.Comments[0].AuthorDescription);
        Assert.NotEqual(marker, outputDoc.Comments[1].AuthorDescription);
        outputDoc.Comments[0].AuthorDescription = marker;
        outputDoc.Comments[1].AuthorDescription = marker;
        Assert.Equal(post1, outputDoc);
    }

    [RavenTheory(RavenTestCategory.Ai)]
    [RavenGenAiData(IntegrationType = RavenAiIntegration.OpenAi, DatabaseMode = RavenDatabaseMode.Single, CheckCanConnect = false, NightlyBuildRequired = false)]
    public async Task GenAiTestModeEditedDocWithAttachments(Options options, GenAiConfiguration config)
    {
        using var store = GetDocumentStore(options);
        await store.Maintenance.SendAsync(new PutConnectionStringOperation<AiConnectionString>(config.Connection));

        config.Prompt = "Describe the following images." + NonEmptyAnswerHint;
        config.Collection = "Posts";
        config.SampleObject = JsonConvert.SerializeObject(
            new { PhotoDescription = "Description of the photo" });

        config.UpdateScript = @"    
const comment = this.Comments.find(c => c.Id == $input.Id);
comment.AuthorDescription = $output.PhotoDescription;
";

        config.GenAiTransformation = new GenAiTransformation
        {
            Script = @"
for(const comment of this.Comments)
{
    let img = loadAttachment(comment.ProfileImage);
    if(!img)
        continue;
    ai.genContext({Id: comment.Id}).withPng(img);
}"
        };

        var marker = "None" + Guid.NewGuid();
        var post1 = new Post("Hello World!",
            new Comment[]
            {
                new Comment(id: "Comment1", author: "Shahar Heart", authorDescription: marker, content: "Hey!", profileImage: "heart.png"),
                new Comment(id: "Comment2", author: "Omer Star", authorDescription: marker, content: "Hello!", profileImage: "star.png"),
                new Comment(id: "Comment3", author: "Aviv Rachmany", authorDescription: marker, content: "Hello", profileImage: "none.png")
            });

        using (var session = store.OpenAsyncSession())
        {
            await session.StoreAsync(post1, "Post/1");

            using var heart = new MemoryStream(Convert.FromBase64String(HeartPngBase64));
            using var star = new MemoryStream(Convert.FromBase64String(StarPngBase64));

            session.Advanced.Attachments.Store("Post/1", "heart.png", heart);
            session.Advanced.Attachments.Store("Post/1", "star.png", star);

            await session.SaveChangesAsync();
        }

        var database = await GetDocumentDatabaseInstanceFor(store);
        using var _ = database.DocumentsStorage.ContextPool.AllocateOperationContext(out DocumentsOperationContext context);

        // Stage 1 : Create Gen Ai Contexts
        // existing doc with edit
        var editedPost1 = new Post() { Content = "Shahar", Comments = post1.Comments };
        var document = store.Conventions.Serialization.DefaultConverter.ToBlittable(editedPost1, context);
        var createCtx3 = await store.Maintenance.SendAsync(context, new TestCreateGenAiContextOperation("Post/1", document, config));
        var genAiContexts = createCtx3.Results;
        Assert.Equal(2, genAiContexts.Count);
        Assert.NotNull(genAiContexts[0].ContextOutput.Context);
        Assert.NotNull(genAiContexts[1].ContextOutput.Context);
        Assert.Equal(1, genAiContexts[0].ContextOutput.Attachments.Count);
        Assert.Equal(1, genAiContexts[1].ContextOutput.Attachments.Count);
        Assert.Equal("heart.png", genAiContexts[0].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal("star.png", genAiContexts[1].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal("image/png", genAiContexts[0].ContextOutput.Attachments.FirstOrDefault()?.Type);
        Assert.Equal("image/png", genAiContexts[1].ContextOutput.Attachments.FirstOrDefault()?.Type);
        Assert.NotNull(genAiContexts[0].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        Assert.NotNull(genAiContexts[1].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);


        // Stage 2 : Send to model
        var sendToModel = await store.Maintenance.SendAsync(context, new TestGenAiSendToModelOperation(genAiContexts, config));
        var contextsAndOutputs = sendToModel.Results;
        Assert.Equal(2, contextsAndOutputs.Count);
        Assert.NotNull(contextsAndOutputs[0].ContextOutput.Context);
        Assert.NotNull(contextsAndOutputs[1].ContextOutput.Context);
        Assert.Equal(1, contextsAndOutputs[0].ContextOutput.Attachments.Count);
        Assert.Equal(1, contextsAndOutputs[1].ContextOutput.Attachments.Count);
        Assert.Equal("heart.png", contextsAndOutputs[0].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal("star.png", contextsAndOutputs[1].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.NotNull(contextsAndOutputs[0].ModelOutput?.Output);
        Assert.NotNull(contextsAndOutputs[1].ModelOutput?.Output);

        // Stage 3 : Update Script
        // doc id
        var updateScriptRes = await store.Maintenance.SendAsync(context, new TestGenAiUpdateScriptOperation("Post/1", contextsAndOutputs, config));
        var inputDoc = ToPost(updateScriptRes.InputDocument);
        Assert.Equal(post1, inputDoc);
        var outputDoc = ToPost(updateScriptRes.OutputDocument);
        Assert.NotEqual(marker, outputDoc.Comments[0].AuthorDescription);
        Assert.NotEqual(marker, outputDoc.Comments[1].AuthorDescription);
        outputDoc.Comments[0].AuthorDescription = marker;
        outputDoc.Comments[1].AuthorDescription = marker;
        Assert.Equal(post1, outputDoc);

        // doc
        updateScriptRes = await store.Maintenance.SendAsync(context, new TestGenAiUpdateScriptOperation(document, contextsAndOutputs, config));
        inputDoc = ToPost(updateScriptRes.InputDocument);
        Assert.Equal(editedPost1, inputDoc);
        outputDoc = ToPost(updateScriptRes.OutputDocument);
        Assert.NotEqual(marker, outputDoc.Comments[0].AuthorDescription);
        Assert.NotEqual(marker, outputDoc.Comments[1].AuthorDescription);
        outputDoc.Comments[0].AuthorDescription = marker;
        outputDoc.Comments[1].AuthorDescription = marker;
        Assert.Equal(editedPost1, outputDoc);
    }

    [RavenTheory(RavenTestCategory.Ai)]
    [RavenGenAiData(IntegrationType = RavenAiIntegration.OpenAi, DatabaseMode = RavenDatabaseMode.Single, CheckCanConnect = false, NightlyBuildRequired = false)]
    public async Task GenAiTestModeWithNotFoundAttachments(Options options, GenAiConfiguration config)
    {
        using var store = GetDocumentStore(options);
        await store.Maintenance.SendAsync(new PutConnectionStringOperation<AiConnectionString>(config.Connection));

        config.Prompt = "Describe the following images." + NonEmptyAnswerHint;
        config.Collection = "Posts";
        config.SampleObject = JsonConvert.SerializeObject(
            new { PhotoDescription = "Description of the photo" });

        config.UpdateScript = @"    
const comment = this.Comments.find(c => c.Id == $input.Id);
comment.AuthorDescription = $output.PhotoDescription;
";

        config.GenAiTransformation = new GenAiTransformation
        {
            Script = @"
for(const comment of this.Comments)
{
    let img = loadAttachment(comment.ProfileImage);
    ai.genContext({Id: comment.Id}).withPng(img);
}"
        };

        var marker = "None" + Guid.NewGuid();
        var post1 = new Post("Hello World!",
            new Comment[]
            {
                new Comment(id: "Comment1", author: "Shahar Heart", authorDescription: marker, content: "Hey!", profileImage: "heart.png"),
                new Comment(id: "Comment2", author: "Omer Star", authorDescription: marker, content: "Hello!", profileImage: "star.png"),
                new Comment(id: "Comment3", author: "Aviv Rachmany", authorDescription: marker, content: "Hello", profileImage: "none.png")
            });

        using (var session = store.OpenAsyncSession())
        {
            await session.StoreAsync(post1, "Post/1");

            using var heart = new MemoryStream(Convert.FromBase64String(HeartPngBase64));
            using var star = new MemoryStream(Convert.FromBase64String(StarPngBase64));

            session.Advanced.Attachments.Store("Post/1", "heart.png", heart);
            session.Advanced.Attachments.Store("Post/1", "star.png", star);

            await session.SaveChangesAsync();
        }

        var database = await GetDocumentDatabaseInstanceFor(store);
        using var _ = database.DocumentsStorage.ContextPool.AllocateOperationContext(out DocumentsOperationContext context);

        // Stage 1 : Create Gen Ai Contexts
        // test-doc (sending new doc - doesn't exist)
        var document = store.Conventions.Serialization.DefaultConverter.ToBlittable(post1, context);
        var createCtx2 = await store.Maintenance.SendAsync(context, new TestCreateGenAiContextOperation(document, config));
        var genAiContexts2 = createCtx2.Results;
        Assert.Equal(3, genAiContexts2.Count);
        var attNames = new string[] { "heart.png", "star.png", "none.png" };
        for (int i = 0; i < 3; i++)
        {
            Assert.Equal(1, genAiContexts2[i].ContextOutput.Attachments.Count);
            Assert.Equal(attNames[i], genAiContexts2[i].ContextOutput.Attachments.FirstOrDefault()?.Name);
            Assert.Equal(string.Empty, genAiContexts2[i].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
            Assert.Equal(AiAttachmentState.NotFound, genAiContexts2[i].ContextOutput.Attachments.FirstOrDefault()?.State);
            Assert.Equal("image/png", genAiContexts2[0].ContextOutput.Attachments.FirstOrDefault()?.Type);
        }

        // Existing doc with attachments
        var createCtx = await store.Maintenance.SendAsync(context, new TestCreateGenAiContextOperation("Post/1", config));
        var genAiContexts = createCtx.Results;
        Assert.Equal(3, genAiContexts.Count);
        Assert.NotNull(genAiContexts[0].ContextOutput.Context);
        Assert.NotNull(genAiContexts[1].ContextOutput.Context);
        Assert.Equal(1, genAiContexts[0].ContextOutput.Attachments.Count);
        Assert.Equal(1, genAiContexts[1].ContextOutput.Attachments.Count);
        Assert.Equal("heart.png", genAiContexts[0].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal("star.png", genAiContexts[1].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal("image/png", genAiContexts[0].ContextOutput.Attachments.FirstOrDefault()?.Type);
        Assert.Equal("image/png", genAiContexts[1].ContextOutput.Attachments.FirstOrDefault()?.Type);
        Assert.Equal(HeartPngBase64.Substring(0, 100) + "...", genAiContexts[0].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        Assert.Equal(StarPngBase64.Substring(0, 100) + "...", genAiContexts[1].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        Assert.Equal(AiAttachmentState.Loaded, genAiContexts[0].ContextOutput.Attachments.FirstOrDefault()?.State);
        Assert.Equal(AiAttachmentState.Loaded, genAiContexts[1].ContextOutput.Attachments.FirstOrDefault()?.State);
        Assert.NotNull(genAiContexts[0].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        Assert.NotNull(genAiContexts[1].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);

        Assert.Equal(1, genAiContexts[2].ContextOutput.Attachments.Count);
        Assert.Equal("none.png", genAiContexts[2].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal(string.Empty, genAiContexts[2].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        Assert.Equal(AiAttachmentState.NotFound, genAiContexts[2].ContextOutput.Attachments.FirstOrDefault()?.State);
        Assert.Equal("image/png", genAiContexts[2].ContextOutput.Attachments.FirstOrDefault()?.Type);


        // Stage 2 : Send to model
        var sendToModel = await store.Maintenance.SendAsync(context, new TestGenAiSendToModelOperation(genAiContexts, config));
        var contextsAndOutputs = sendToModel.Results;
        Assert.Equal(3, contextsAndOutputs.Count);
        Assert.NotNull(contextsAndOutputs[0].ContextOutput.Context);
        Assert.NotNull(contextsAndOutputs[1].ContextOutput.Context);
        Assert.Equal(1, contextsAndOutputs[0].ContextOutput.Attachments.Count);
        Assert.Equal(1, contextsAndOutputs[1].ContextOutput.Attachments.Count);
        Assert.Equal("heart.png", contextsAndOutputs[0].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal("star.png", contextsAndOutputs[1].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal("none.png", contextsAndOutputs[2].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal(AiAttachmentState.Loaded, contextsAndOutputs[0].ContextOutput.Attachments.FirstOrDefault()?.State);
        Assert.Equal(AiAttachmentState.Loaded, contextsAndOutputs[1].ContextOutput.Attachments.FirstOrDefault()?.State);
        Assert.Equal(AiAttachmentState.NotFound, contextsAndOutputs[2].ContextOutput.Attachments.FirstOrDefault()?.State);
        Assert.Equal(HeartPngBase64.Substring(0, 100) + "...", contextsAndOutputs[0].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        Assert.Equal(StarPngBase64.Substring(0, 100) + "...", contextsAndOutputs[1].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        Assert.Equal(string.Empty, contextsAndOutputs[2].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        Assert.NotNull(contextsAndOutputs[0].ModelOutput?.Output);
        Assert.NotNull(contextsAndOutputs[1].ModelOutput?.Output);
        Assert.NotNull(contextsAndOutputs[2].ModelOutput?.Output);
        
        // Stage 3 : Update Script
        // doc id
        var updateScriptRes = await store.Maintenance.SendAsync(context, new TestGenAiUpdateScriptOperation("Post/1", contextsAndOutputs, config));
        var inputDoc = ToPost(updateScriptRes.InputDocument);
        Assert.Equal(post1, inputDoc);
        var outputDoc = ToPost(updateScriptRes.OutputDocument);
        Assert.NotEqual(marker, outputDoc.Comments[0].AuthorDescription);
        Assert.NotEqual(marker, outputDoc.Comments[1].AuthorDescription);
        Assert.NotEqual(marker, outputDoc.Comments[2].AuthorDescription);

        outputDoc.Comments[0].AuthorDescription = marker;
        outputDoc.Comments[1].AuthorDescription = marker;
        outputDoc.Comments[2].AuthorDescription = marker;
        Assert.Equal(post1, outputDoc);
        
        // doc
        updateScriptRes = await store.Maintenance.SendAsync(context, new TestGenAiUpdateScriptOperation(document, contextsAndOutputs, config));
        inputDoc = ToPost(updateScriptRes.InputDocument);
        Assert.Equal(post1, inputDoc);
        outputDoc = ToPost(updateScriptRes.OutputDocument);
        Assert.NotEqual(marker, outputDoc.Comments[0].AuthorDescription);
        Assert.NotEqual(marker, outputDoc.Comments[1].AuthorDescription);
        Assert.NotEqual(marker, outputDoc.Comments[2].AuthorDescription);
        outputDoc.Comments[0].AuthorDescription = marker;
        outputDoc.Comments[1].AuthorDescription = marker;
        outputDoc.Comments[2].AuthorDescription = marker;
        Assert.Equal(post1, outputDoc);
    }

    [RavenTheory(RavenTestCategory.Ai)]
    [RavenGenAiData(IntegrationType = RavenAiIntegration.OpenAi, DatabaseMode = RavenDatabaseMode.Single, CheckCanConnect = false, NightlyBuildRequired = false)]
    public async Task GenAiTestModeWithUnloadedAttachments(Options options, GenAiConfiguration config)
    {
        using var store = GetDocumentStore(options);
        await store.Maintenance.SendAsync(new PutConnectionStringOperation<AiConnectionString>(config.Connection));

        config.Prompt = "Describe the following images." + NonEmptyAnswerHint;
        config.Collection = "Posts";
        config.SampleObject = JsonConvert.SerializeObject(
            new { PhotoDescription = "Description of the photo" });

        config.UpdateScript = @"    
const comment = this.Comments.find(c => c.Id == $input.Id);
comment.AuthorDescription = $output.PhotoDescription;
";

        config.GenAiTransformation = new GenAiTransformation
        {
            Script = $"const banana = '{BananaPngBase64}'; " +
                @"
for(const comment of this.Comments)
{
    let img = loadAttachment(comment.ProfileImage);
    if (!img){
        ai.genContext({Id: comment.Id}).withPng(banana);
        continue;
    }
        
    ai.genContext({Id: comment.Id}).withPng(img);
}"
        };

        var marker = "None" + Guid.NewGuid();
        var post1 = new Post("Hello World!",
            new Comment[]
            {
                new Comment(id: "Comment1", author: "Shahar Heart", authorDescription: marker, content: "Hey!", profileImage: "heart.png"),
                new Comment(id: "Comment2", author: "Omer Star", authorDescription: marker, content: "Hello!", profileImage: "star.png"),
                new Comment(id: "Comment3", author: "Aviv Rachmany", authorDescription: marker, content: "Hello", profileImage: "none.png")
            });

        using (var session = store.OpenAsyncSession())
        {
            await session.StoreAsync(post1, "Post/1");

            using var heart = new MemoryStream(Convert.FromBase64String(HeartPngBase64));
            using var star = new MemoryStream(Convert.FromBase64String(StarPngBase64));

            session.Advanced.Attachments.Store("Post/1", "heart.png", heart);
            session.Advanced.Attachments.Store("Post/1", "star.png", star);

            await session.SaveChangesAsync();
        }

        var database = await GetDocumentDatabaseInstanceFor(store);
        using var _ = database.DocumentsStorage.ContextPool.AllocateOperationContext(out DocumentsOperationContext context);

        // Stage 1 : Create Gen Ai Contexts
        // test-doc (sending new doc - doesn't exist)
        var document = store.Conventions.Serialization.DefaultConverter.ToBlittable(post1, context);
        var createCtx2 = await store.Maintenance.SendAsync(context, new TestCreateGenAiContextOperation(document, config));
        var genAiContexts2 = createCtx2.Results;
        Assert.Equal(3, genAiContexts2.Count);
        for (int i = 0; i < 2; i++)
        {
            Assert.Equal(1, genAiContexts2[i].ContextOutput.Attachments.Count);
            var att = genAiContexts2[0].ContextOutput.Attachments.First();
            Assert.Equal("unknown.name", att.Name);
            Assert.Equal(AiAttachmentState.Unloaded, att.State);
            Assert.Equal("image/png", att.Type);
            Assert.Equal(BananaPngBase64, att.DataAsBase64);
        }

        // Existing doc with attachments
        var createCtx = await store.Maintenance.SendAsync(context, new TestCreateGenAiContextOperation("Post/1", config));
        var genAiContexts = createCtx.Results;
        Assert.Equal(3, genAiContexts.Count);
        Assert.NotNull(genAiContexts[0].ContextOutput.Context);
        Assert.NotNull(genAiContexts[1].ContextOutput.Context);
        Assert.Equal(1, genAiContexts[0].ContextOutput.Attachments.Count);
        Assert.Equal(1, genAiContexts[1].ContextOutput.Attachments.Count);
        Assert.Equal("heart.png", genAiContexts[0].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal("star.png", genAiContexts[1].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal("image/png", genAiContexts[0].ContextOutput.Attachments.FirstOrDefault()?.Type);
        Assert.Equal("image/png", genAiContexts[1].ContextOutput.Attachments.FirstOrDefault()?.Type);
        Assert.Equal(HeartPngBase64.Substring(0, 100) + "...", genAiContexts[0].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        Assert.Equal(StarPngBase64.Substring(0, 100) + "...", genAiContexts[1].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        Assert.Equal(AiAttachmentState.Loaded, genAiContexts[0].ContextOutput.Attachments.FirstOrDefault()?.State);
        Assert.Equal(AiAttachmentState.Loaded, genAiContexts[1].ContextOutput.Attachments.FirstOrDefault()?.State);
        Assert.NotNull(genAiContexts[0].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        Assert.NotNull(genAiContexts[1].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        
        Assert.Equal(1, genAiContexts[2].ContextOutput.Attachments.Count);
        Assert.Equal("unknown.name", genAiContexts[2].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal(BananaPngBase64, genAiContexts[2].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        Assert.Equal(AiAttachmentState.Unloaded, genAiContexts[2].ContextOutput.Attachments.FirstOrDefault()?.State);
        Assert.Equal("image/png", genAiContexts[2].ContextOutput.Attachments.FirstOrDefault()?.Type);
        
        
        // Stage 2 : Send to model
        var sendToModel = await store.Maintenance.SendAsync(context, new TestGenAiSendToModelOperation(genAiContexts, config));
        var contextsAndOutputs = sendToModel.Results;
        Assert.Equal(3, contextsAndOutputs.Count);
        Assert.NotNull(contextsAndOutputs[0].ContextOutput.Context);
        Assert.NotNull(contextsAndOutputs[1].ContextOutput.Context);
        Assert.Equal(1, contextsAndOutputs[0].ContextOutput.Attachments.Count);
        Assert.Equal(1, contextsAndOutputs[1].ContextOutput.Attachments.Count);
        Assert.Equal("heart.png", contextsAndOutputs[0].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal("star.png", contextsAndOutputs[1].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal("unknown.name", contextsAndOutputs[2].ContextOutput.Attachments.FirstOrDefault()?.Name);
        Assert.Equal(AiAttachmentState.Loaded, contextsAndOutputs[0].ContextOutput.Attachments.FirstOrDefault()?.State);
        Assert.Equal(AiAttachmentState.Loaded, contextsAndOutputs[1].ContextOutput.Attachments.FirstOrDefault()?.State);
        Assert.Equal(AiAttachmentState.Unloaded, contextsAndOutputs[2].ContextOutput.Attachments.FirstOrDefault()?.State);
        Assert.Equal(HeartPngBase64.Substring(0, 100) + "...", contextsAndOutputs[0].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        Assert.Equal(StarPngBase64.Substring(0, 100) + "...", contextsAndOutputs[1].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        Assert.Equal(BananaPngBase64, contextsAndOutputs[2].ContextOutput.Attachments.FirstOrDefault()?.DataAsBase64);
        Assert.NotNull(contextsAndOutputs[0].ModelOutput?.Output);
        Assert.NotNull(contextsAndOutputs[1].ModelOutput?.Output);
        Assert.NotNull(contextsAndOutputs[2].ModelOutput?.Output);
        
        // Stage 3 : Update Script
        // doc id
        var updateScriptRes = await store.Maintenance.SendAsync(context, new TestGenAiUpdateScriptOperation("Post/1", contextsAndOutputs, config));
        var inputDoc = ToPost(updateScriptRes.InputDocument);
        Assert.Equal(post1, inputDoc);
        var outputDoc = ToPost(updateScriptRes.OutputDocument);
        Assert.NotEqual(marker, outputDoc.Comments[0].AuthorDescription);
        Assert.NotEqual(marker, outputDoc.Comments[1].AuthorDescription);
        Assert.NotEqual(marker, outputDoc.Comments[2].AuthorDescription);
        
        outputDoc.Comments[0].AuthorDescription = marker;
        outputDoc.Comments[1].AuthorDescription = marker;
        outputDoc.Comments[2].AuthorDescription = marker;
        Assert.Equal(post1, outputDoc);
        
        // doc
        updateScriptRes = await store.Maintenance.SendAsync(context, new TestGenAiUpdateScriptOperation(document, contextsAndOutputs, config));
        inputDoc = ToPost(updateScriptRes.InputDocument);
        Assert.Equal(post1, inputDoc);
        outputDoc = ToPost(updateScriptRes.OutputDocument);
        Assert.NotEqual(marker, outputDoc.Comments[0].AuthorDescription);
        Assert.NotEqual(marker, outputDoc.Comments[1].AuthorDescription);
        Assert.NotEqual(marker, outputDoc.Comments[2].AuthorDescription);
        outputDoc.Comments[0].AuthorDescription = marker;
        outputDoc.Comments[1].AuthorDescription = marker;
        outputDoc.Comments[2].AuthorDescription = marker;
        Assert.Equal(post1, outputDoc);
    }

    [RavenTheory(RavenTestCategory.Ai)]
    [RavenGenAiData(IntegrationType = RavenAiIntegration.OpenAi, DatabaseMode = RavenDatabaseMode.Single, CheckCanConnect = false, NightlyBuildRequired = false)]
    public async Task Test(Options options, GenAiConfiguration config)
    {
        using var store = GetDocumentStore(options);
        await store.Maintenance.SendAsync(new PutConnectionStringOperation<AiConnectionString>(config.Connection));

        config.Prompt = "Describe the following images." + NonEmptyAnswerHint;
        config.Collection = "Posts";
        config.SampleObject = JsonConvert.SerializeObject(
            new { PhotoDescription = "Description of the photo" });

        config.UpdateScript = @"    
const comment = this.Comments.find(c => c.Id == $input.Id);
comment.AuthorDescription = $output.PhotoDescription;
";

        config.GenAiTransformation = new GenAiTransformation
        {
            Script = $"const banana = '{BananaPngBase64}'; " +
@"
for(const comment of this.Comments)
{
    let img = loadAttachment(comment.ProfileImage);
    if (comment.ProfileImage === 'all'){
        ai.genContext({Id: comment.Id})
            .withPng(loadAttachment('heart.png'))
            .withPng(loadAttachment('star.png'))
            .withPng(loadAttachment('none.png'))
            .withPng(banana);
        continue;
    }

    if (comment.ProfileImage === 'banana'){
        ai.genContext({Id: comment.Id}).withPng(banana);
        continue;
    }

    ai.genContext({Id: comment.Id}).withPng(img);
}"
        };

        var marker = "None" + Guid.NewGuid();
        var post1 = new Post("Hello World!",
            new Comment[]
            {
                new Comment(id: "Comment0", author: "Oren All", authorDescription: marker, content: "Hi!", profileImage: "all"),
                // new Comment(id: "Comment1", author: "Shahar Heart", authorDescription: marker, content: "Hey!", profileImage: "heart.png"),
                // new Comment(id: "Comment2", author: "Omer Star", authorDescription: marker, content: "Hello!", profileImage: "star.png"),
                // new Comment(id: "Comment3", author: "Aviv Rachmany", authorDescription: marker, content: "Hello", profileImage: "none.png"),
                // new Comment(id: "Comment4", author: "Karmel Banana", authorDescription: marker, content: "Hello there", profileImage: "banana"),
            });

        using (var session = store.OpenAsyncSession())
        {
            await session.StoreAsync(post1, "Post/1");

            using var heart = new MemoryStream(Convert.FromBase64String(HeartPngBase64));
            using var star = new MemoryStream(Convert.FromBase64String(StarPngBase64));

            session.Advanced.Attachments.Store("Post/1", "heart.png", heart);
            session.Advanced.Attachments.Store("Post/1", "star.png", star);

            await session.SaveChangesAsync();
        }

        var database = await GetDocumentDatabaseInstanceFor(store);
        using var _ = database.DocumentsStorage.ContextPool.AllocateOperationContext(out DocumentsOperationContext context);


        // Existing doc with attachments
        var createCtx = await store.Maintenance.SendAsync(context, new TestCreateGenAiContextOperation("Post/1", config));
        var genAiContexts = createCtx.Results;
    }

    private static readonly Func<BlittableJsonReaderObject, Post> ToPost = JsonDeserializationClient.GenerateJsonDeserializationRoutine<Post>();

    private class TestCreateGenAiContextOperation : IMaintenanceOperation<GenAiTestScriptResult>
    {
        private readonly TestGenAiScript _testGenAiScript;

        public TestCreateGenAiContextOperation(string docId, GenAiConfiguration config)
        {
            _testGenAiScript = new TestGenAiScript
            {
                DocumentId = docId,
                Configuration = config,
                TestStage = TestStage.CreateContextObjects
            };
        }

        public TestCreateGenAiContextOperation(BlittableJsonReaderObject doc, GenAiConfiguration config)
        {
            _testGenAiScript = new TestGenAiScript
            {
                Document = doc,
                Configuration = config,
                TestStage = TestStage.CreateContextObjects
            };
        }

        public TestCreateGenAiContextOperation(string docId, BlittableJsonReaderObject doc, GenAiConfiguration config)
        {
            _testGenAiScript = new TestGenAiScript
            {
                DocumentId = docId,
                Document = doc,
                Configuration = config,
                TestStage = TestStage.CreateContextObjects
            };
        }

        public RavenCommand<GenAiTestScriptResult> GetCommand(DocumentConventions conventions, JsonOperationContext context)
        {
            return new TestGenAiCommand(_testGenAiScript, conventions);
        }
    }

    private class TestGenAiSendToModelOperation : IMaintenanceOperation<GenAiTestScriptResult>
    {
        private readonly TestGenAiScript _testGenAiScript;

        public TestGenAiSendToModelOperation(List<GenAiResultItem> genAiContexts, GenAiConfiguration config)
        {
            _testGenAiScript = new TestGenAiScript
            {
                Input = genAiContexts,
                Configuration = config,
                TestStage = TestStage.SendToModel
            };
        }

        public RavenCommand<GenAiTestScriptResult> GetCommand(DocumentConventions conventions, JsonOperationContext context)
        {
            return new TestGenAiCommand(_testGenAiScript, conventions);
        }
    }

    private class TestGenAiUpdateScriptOperation : IMaintenanceOperation<GenAiTestScriptResult>
    {
        private readonly TestGenAiScript _testGenAiScript;

        public TestGenAiUpdateScriptOperation(string docId, List<GenAiResultItem> genAiContextsAndModelOutputs, GenAiConfiguration config)
        {
            _testGenAiScript = new TestGenAiScript
            {
                DocumentId = docId,
                Input = genAiContextsAndModelOutputs,
                Configuration = config,
                TestStage = TestStage.ApplyUpdateScript
            };
        }

        public TestGenAiUpdateScriptOperation(BlittableJsonReaderObject doc, List<GenAiResultItem> genAiContextsAndModelOutputs, GenAiConfiguration config)
        {
            _testGenAiScript = new TestGenAiScript
            {
                Document = doc,
                Input = genAiContextsAndModelOutputs,
                Configuration = config,
                TestStage = TestStage.ApplyUpdateScript
            };
        }

        public RavenCommand<GenAiTestScriptResult> GetCommand(DocumentConventions conventions, JsonOperationContext context)
        {
            return new TestGenAiCommand(_testGenAiScript, conventions);
        }
    }

    private class TestGenAiCommand(TestGenAiScript testGenAiScript, DocumentConventions conventions) : RavenCommand<GenAiTestScriptResult>
    {

        public override bool IsReadRequest { get; } = true;
        public override HttpRequestMessage CreateRequest(JsonOperationContext ctx, ServerNode node, out string url)
        {
            url = $"{node.Url}/databases/{node.Database}/admin/ai/gen-ai/test";
            var bjro = ctx.ReadObject(testGenAiScript.ToJson(), "TestGenAiCommand_payload");
            return new HttpRequestMessage
            {
                Method = HttpMethods.Post,
                Content = new BlittableJsonContent(async stream => await ctx.WriteAsync(stream, bjro).ConfigureAwait(false), conventions)
            };
        }
        public override void SetResponse(JsonOperationContext context, BlittableJsonReaderObject response, bool fromCache)
        {
            Result = DeserializeToTestEtlScriptResult(response);
        }

        private static readonly Func<BlittableJsonReaderObject, GenAiTestScriptResult> DeserializeToTestEtlScriptResult = JsonDeserializationClient.GenerateJsonDeserializationRoutine<GenAiTestScriptResult>();

    }
}
