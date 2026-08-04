import React from "react";
import ConnectionStringError from "./ConnectionTestError";
import RichAlert from "components/common/RichAlert";

interface ConnectionTestResultProps {
    testResult: Raven.Server.Web.System.NodeConnectionTestResult;
    isImageInputSupportShown?: boolean;
}

export default function ConnectionTestResult({ testResult, isImageInputSupportShown }: ConnectionTestResultProps) {
    if (!testResult) {
        return null;
    }

    if (!testResult.Success) {
        return <ConnectionStringError message={testResult.Error} />;
    }

    return (
        <>
            <RichAlert variant="success">Successfully connected</RichAlert>
            {isImageInputSupportShown && !testResult.AcceptsImageInput && (
                <RichAlert variant="warning" className="mt-2">
                    The model rejected an image attachment, so image attachments are expected to fail with it.
                </RichAlert>
            )}
        </>
    );
}
