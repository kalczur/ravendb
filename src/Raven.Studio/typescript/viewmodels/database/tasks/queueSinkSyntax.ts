import dialogViewModelBase = require("viewmodels/dialogViewModelBase");
import copyToClipboard = require("common/copyToClipboard");
import viewModelBase = require("viewmodels/viewModelBase");
import prismjs = require("prismjs");

class queueSinkSyntax extends dialogViewModelBase {
    
    view = require("views/database/tasks/queueSinkSyntax.html"); 
    scriptFunctionsSyntaxView = require("views/database/patch/scriptFunctionsSyntax.html");

    dialogContainer: Element;
    clientVersion = viewModelBase.clientVersion;

    compositionComplete() {
        super.compositionComplete();
        this.bindToCurrentInstance("copySample");
        this.dialogContainer = document.getElementById("patchSyntaxDialog");
    }

    copySample(sampleTitle: string) {
        const sampleText = queueSinkSyntax.samples.find(x => x.title === sampleTitle).text;
        copyToClipboard.copy(sampleText, "Sample has been copied to clipboard");
    }

    private static assignCollectionCode = `this['@metadata']['@collection'] = 'Users'; 
put(this.Id, this)`;
    private static mapAndPutCode = `var item = { 
    Id : this.Id, 
    FirstName : this.FirstName, 
    LastName : this.LastName, 
    FullName : this.FirstName + ' ' + this.LastName, 
    "@metadata" : {
        "@collection" : "Users"
    }
};
put(this.Id.toString(), item)`;
    
    static readonly samples: Array<sampleCode> = [
        {
            title: "Assign collection and put document",
            text: queueSinkSyntax.assignCollectionCode,
            html: prismjs.highlight(queueSinkSyntax.assignCollectionCode, prismjs.languages.javascript, "js")
        },
        {
            title: "Map and put document",
            text: queueSinkSyntax.mapAndPutCode,
            html: prismjs.highlight(queueSinkSyntax.mapAndPutCode, prismjs.languages.javascript, "js")
        }
    ];
}

export = queueSinkSyntax;
