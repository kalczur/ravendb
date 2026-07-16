import { useEffect, useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import { Icon } from "components/common/Icon";
import { getCurrentLanguage, restoreLanguageOnStartup, setLanguage, studioLanguages } from "./googleTranslate";
import "./LanguageSwitcherNavIcon.scss";

export default function LanguageSwitcherNavIcon() {
    const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage);

    useEffect(() => {
        restoreLanguageOnStartup();
    }, []);

    const handleSelect = (code: string) => {
        setCurrentLanguage(code);
        setLanguage(code);
    };

    return (
        <Dropdown align="end" className="language-switcher notranslate">
            <Dropdown.Toggle title="Change language" variant="link" className="btn no-decor nav-icon">
                <Icon icon="global" margin="m-0" />
            </Dropdown.Toggle>
            <Dropdown.Menu>
                {studioLanguages.map((language) => (
                    <Dropdown.Item
                        key={language.code}
                        active={language.code === currentLanguage}
                        onClick={() => handleSelect(language.code)}
                    >
                        {language.name}
                    </Dropdown.Item>
                ))}
            </Dropdown.Menu>
        </Dropdown>
    );
}
