import React from 'react';

export const TypeFilter = ({ expanded, toggleExpand, filters, onChange }) => {
    const handleChange = (e) => {
        onChange(e.target.id, e.target.checked);
    };

    return (
        <div id="typeContainer">
            <div id="topSection">
                <div id="topTitle">Filter by Type</div>
                <div id="topButton">
                    <button id="nope" onClick={toggleExpand}></button>
                </div>
            </div>

            <div id="expandContainer" className={expanded ? 'expanded' : 'collapsed'}>
                <div id="expandContract" className={expanded ? 'expanded' : 'collapsed'}>
                    <p><b>Type of Fire</b></p>
                    <div className="checkbox-wrapper-29">
                        <label className="checkbox">
                            <input
                                type="checkbox"
                                className="checkbox__input"
                                id="typePVF"
                                checked={filters.typePVF}
                                onChange={handleChange}
                            />
                            <span className="checkbox__label"></span>
                            &#128293; Presumed Vegetation Fire
                        </label>
                    </div>
                    <div className="checkbox-wrapper-29">
                        <label className="checkbox">
                            <input
                                type="checkbox"
                                className="checkbox__input"
                                id="typeOSLS"
                                checked={filters.typeOSLS}
                                onChange={handleChange}
                            />
                            <span className="checkbox__label"></span>
                            &#127755; Active Volcano
                        </label>
                    </div>
                    <div className="checkbox-wrapper-29">
                        <label className="checkbox">
                            <input
                                type="checkbox"
                                className="checkbox__input"
                                id="typeO"
                                checked={filters.typeO}
                                onChange={handleChange}
                            />
                            <span className="checkbox__label"></span>
                            &#128270; Other Static Land Source
                        </label>
                    </div>
                    <div className="checkbox-wrapper-29">
                        <label className="checkbox">
                            <input
                                type="checkbox"
                                className="checkbox__input"
                                id="typeAV"
                                checked={filters.typeAV}
                                onChange={handleChange}
                            />
                            <span className="checkbox__label"></span>
                            &#127754; Offshore
                        </label>
                    </div>

                    <p><b>Time of Fire</b></p>
                    <div className="checkbox-wrapper-29">
                        <label className="checkbox">
                            <input
                                type="checkbox"
                                className="checkbox__input"
                                id="typeDay"
                                checked={filters.typeDay}
                                onChange={handleChange}
                            />
                            <span className="checkbox__label"></span>
                            &#9728;&#65039; Day
                        </label>
                    </div>
                    <div className="checkbox-wrapper-29">
                        <label className="checkbox">
                            <input
                                type="checkbox"
                                className="checkbox__input"
                                id="typeNight"
                                checked={filters.typeNight}
                                onChange={handleChange}
                            />
                            <span className="checkbox__label"></span>
                            &#127769; Night
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};