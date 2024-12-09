import commandBase = require("commands/commandBase");
import endpoints = require("endpoints");

class getAdminLogsConfigurationCommand extends commandBase {
    
    execute(): JQueryPromise<Raven.Client.ServerWide.Operations.Logs.GetLogsConfigurationResult> {
        const url = endpoints.global.adminLogs.adminLogsConfiguration;
        
        return this.query<Raven.Client.ServerWide.Operations.Logs.GetLogsConfigurationResult>(url, null)
            .fail((response: JQueryXHR) => this.reportError(`Failed to get admin logs configuration`, response.responseText, response.statusText)) 
    }
}

export = getAdminLogsConfigurationCommand;
