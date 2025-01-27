using System;
using Sparrow.Json.Parsing;

namespace Raven.Client.Documents.Operations.Replication
{
    public sealed class ReplicationHubAccess : IDynamicJson
    {
        public string Name;
        public string CertificateBase64;
        
        public string[] AllowedHubToSinkPaths;
        public string[] AllowedSinkToHubPaths;

        public DynamicJsonValue ToJson()
        {
            return new DynamicJsonValue
            {
                [nameof(Name)] = Name,
                [nameof(AllowedHubToSinkPaths)] = AllowedHubToSinkPaths,
                [nameof(AllowedSinkToHubPaths)] = AllowedSinkToHubPaths,
                [nameof(CertificateBase64)] = CertificateBase64
            };
        }

        internal void Validate(bool filteringIsRequired)
        {
            if (string.IsNullOrEmpty(Name))
                throw new ArgumentNullException(nameof(Name));

            if (filteringIsRequired)
            {
                if ((AllowedHubToSinkPaths?.Length ?? 0) == 0 && (AllowedSinkToHubPaths?.Length == 0))
                    throw new InvalidOperationException(
                        $"Either {nameof(AllowedSinkToHubPaths)} or {nameof(AllowedHubToSinkPaths)} must have a value, but both were null or empty");
            }
            else
            {
                if (AllowedHubToSinkPaths?.Length > 0 || AllowedSinkToHubPaths?.Length > 0)
                    throw new InvalidOperationException(
                        $"Filtering replication is not set for this Replication Hub task." +
                        $" {nameof(AllowedSinkToHubPaths)} and {nameof(AllowedHubToSinkPaths)} cannot have a value.");  
            }

            ValidateAllowedPaths(AllowedHubToSinkPaths);
            ValidateAllowedPaths(AllowedSinkToHubPaths);
        }

        private void ValidateAllowedPaths(string[] allowedPaths)
        {
            if ((allowedPaths?.Length ?? 0) == 0)
                return;

            foreach (string path in allowedPaths)
            {
                if (string.IsNullOrEmpty(path))
                    throw new InvalidOperationException("Filtered replication AllowedPaths cannot have an empty / null filter");

                if (path[path.Length - 1] != '*')
                    continue;

                if (path.Length > 1 && path[path.Length - 2] != '/' && path[path.Length - 2] != '-')
                    throw new InvalidOperationException(
                        $"When using '*' at the end of the allowed path, the previous character must be '/' or '-', but got: {path} for {Name}");
            }
        }
    }
}
