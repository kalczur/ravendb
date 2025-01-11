/// <reference path="../../../typings/tsd.d.ts" />

import getClientCertificateCommand = require("commands/auth/getClientCertificateCommand");
import moment = require("moment");
import serverSettings = require("common/settings/serverSettings");

type clientCertificateExpiration = "unknown" | "valid" | "aboutToExpire" | "expired";

class clientCertificateModel {
    static certificateInfo = ko.observable<Raven.Client.ServerWide.Operations.Certificates.CertificateDefinition & { HasTwoFactor: boolean; TwoFactorExpirationDate: string; }>();
    
    static certificateExpirationState = ko.pureComputed<clientCertificateExpiration>(() => {
        const info = clientCertificateModel.certificateInfo();
        if (!info) {
            return "unknown";
        }

        if (!info.NotAfter) {
            // master key case
            return "valid";
        }
        
        const notAfter = moment(info.NotAfter);
        if (notAfter.isBefore()) {
            return "expired";
        }

        const aboutToExpirePeriod = moment.duration(serverSettings.default.certificateExpiringThresholdInDays(), "days"); 
        
        const warningDate = moment().add(aboutToExpirePeriod);
        if (notAfter.isBefore(warningDate)) {
            return "aboutToExpire";
        }
        
        return "valid";
    });
    
    static fetchClientCertificate(): JQueryPromise<Raven.Client.ServerWide.Operations.Certificates.CertificateDefinition> {
        return new getClientCertificateCommand()
            .execute()
            .done((result) => {
                this.certificateInfo(result);
            });
    }
}

export = clientCertificateModel;
