import { AboutViewAnchored, AccordionItemWrapper } from "components/common/AboutView";
import React from "react";
import { useRavenLink } from "hooks/useRavenLink";
import { Icon } from "components/common/Icon";

export default function DocumentIdentitiesAboutView() {
    const identitiesDocsLink = useRavenLink({ hash: "KOVX2N" });

    return (
        <AboutViewAnchored className="my-4">
            <AccordionItemWrapper
                targetId="1"
                icon="about"
                color="info"
                description="Get additional info on this feature"
                heading="About this view"
            >
                <p>
                    An <strong>identity</strong> is a unique document ID in the database. It is generated by the server
                    when a pipe suffix is added to the requested document ID during document creation.
                </p>
                <p>
                    The identity ID is composed of the collection name and a number that is continuously incremented per
                    document creation.
                </p>
                <p>
                    This view displays the <strong>latest identity values</strong> for all collections in the database.
                    <br /> You can set a new value or update an existing one for a collection.{" "}
                </p>
                <ul>
                    <li>
                        <strong>&quot;Document ID Prefix&quot;</strong> column:
                        <br />
                        This column shows the collection name for which an identity value has been set on the server.
                    </li>
                    <li>
                        <strong>&quot;Latest Value&quot;</strong> column:
                        <br />
                        This column shows the latest identity number set on the server for each collection.
                        <br />
                        The next identity ID created for a collection will use the latest number incremented by 1 as its
                        value in the generated document ID.
                    </li>
                </ul>
                <hr />
                <div className="small-label mb-2">useful links</div>
                <a href={identitiesDocsLink} target="_blank">
                    <Icon icon="newtab" /> Docs - Identities
                </a>
            </AccordionItemWrapper>
        </AboutViewAnchored>
    );
}