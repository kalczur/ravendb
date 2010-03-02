using System.Net;

namespace Rhino.DivanDB.Server.Responders
{
    public class Statistics : RequestResponder
    {
        public override string UrlPattern
        {
            get { return "/stats"; }
        }

        public override string[] SupportedVerbs
        {
            get { return new[]{"GET"}; }
        }
<<<<<<< HEAD

        public override void Respond(HttpListenerContext context)
        {
            context.WriteJson(new { docCount = Database.Statistics.CountOfDocuments });
=======
        public override void Respond(HttpListenerContext context)
        {
            context.WriteJson(Database.Statistics);
>>>>>>> luke
        }
    }
}