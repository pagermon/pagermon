'use strict';
var moment = require('moment');
var SAME_DEFS = require('./dsame-vars.js');

// GIVES BACK COUNTY BASED ON COUNTRY (US/CA) AND PSSCCC DATA
function county_decode(input, COUNTRY) {
    var CCC, P, SS, SSCCC, county;
    [P, SS, CCC, SSCCC] = [input.slice(0, 1), input.slice(1, 3), input.slice(3), input.slice(1)];
    if ((COUNTRY === "US")) {
        county = ((CCC === "000") ? "ALL" : SAME_DEFS.US_SAME_CODE[SSCCC]);
        return [county, SAME_DEFS.US_SAME_AREA[SS]];
    } else {
        county = ((CCC === "000") ? "ALL" : SAME_DEFS.CA_SAME_CODE[SSCCC]);
        return [county, SAME_DEFS.CA_SAME_AREA[SS]];
    }
}

// GIVES BACK DIVISION ie(COUNTY/AREA/PARISH/BURROH) LOOKS TO BE A LEGACY THING AS FAR AS SAME ENCODING GOES
function get_division(input, COUNTRY = "US") {
    var DIVISION;
    if ((COUNTRY === "US")) {
        if (input in SAME_DEFS.FIPS_DIVN) {
            DIVISION = SAME_DEFS.FIPS_DIVN[input];
            DIVISION = ((!DIVISION) ? "areas" : DIVISION);
        } else {
            DIVISION = "counties";
        }
    } else {
        DIVISION = "areas";
    }
    return DIVISION;
}

// CONVERTS EEE TO READABLE MESSAGE SO RWT BECOMES REQUIRED WEEKLY TEST MORE INFO HERE https://en.wikipedia.org/wiki/Specific_Area_Message_Encoding
function get_event(input) {
    var event;
    event = null;
    if (input in SAME_DEFS.SAME__EEE) {
        event = SAME_DEFS.SAME__EEE[input];
    } else {
        // IF NO MATCHES RETURNS "UNKNOWN [TYPE OF MESSAGE]" SO FOR XXT "UNKNOWN WARNING" WOULD BE RETURNED
        event = (input.slice(2) in "WAESTMN" ? " ".join(["Unknown", SAME_DEFS.SAME_UEEE[input.slice(2)]]) : "Unknown");
    }
    return event;
}

// GETS THE END OF THE ALERT FRO JJJHHMM TO SEONDS, IN UTC
function alert_end(JJJHHMM, TTTT) {
    var ts, utc_dt;
    utc_dt = moment.utc(JJJHHMM, 'DDDHHmm');
    utc_dt.add(TTTT.substring(0, 2), "h").add(TTTT.substring(2, 4), "m")
    ts = moment(utc_dt).local().format('LT'); 
    return ts;
}

// GET SECONDS FROM TTTT WHICH FOR AN EVENT THAT LASTS 1 HOUR AND 30 MIN WOULE LOKE LIKE TTTT 0130
function alert_length(TTTT) {
    var delta;
    delta = moment.duration({ hours: parseInt(TTTT.substring(0, 2)), minutes: parseInt(TTTT.substring(2, 4)) })
    return delta.asSeconds();
}

// CONVERTS KNWS/NWS STATION TO LOCAL FORCAST OFFICE koax becomes Omaha, NE Plans to add Local FM/AM stations
function get_location(STATION = null, TYPE = null) {
    var location;
    try {
        location = ((TYPE === "NWS") ? SAME_DEFS.WFO_LIST[STATION] + " " : "");
    } catch (e) {
        location = "";
    }
    return location;
}


// Makes the message readable and pretty
function readable_message(ORG = "WXR", EEE = "RWT", PSSCCC = [], TTTT = "0030", JJJHHMM = "0010000", STATION = null, TYPE = null, LLLLLLLL = null, COUNTRY = "US", LANG = "EN") {
    var DIVISION, MSG, county, current_state, idx, location, output, state, article, organization, preposition, location, has, event, end;
    
    event = get_event(EEE);    
    end = alert_end(JJJHHMM, TTTT);
    organization = SAME_DEFS.SAME__ORG[ORG]["NAME"][COUNTRY];
    location = get_location(STATION, TYPE);
    // Some grsmmer and formatting hacks
    article = SAME_DEFS.MSG__TEXT[LANG][SAME_DEFS.SAME__ORG[ORG]["ARTICLE"][COUNTRY]].charAt(0).toUpperCase() + SAME_DEFS.MSG__TEXT[LANG][SAME_DEFS.SAME__ORG[ORG]["ARTICLE"][COUNTRY]].slice(1);
    has = ((!SAME_DEFS.SAME__ORG[ORG]["PLURAL"]) ? SAME_DEFS.MSG__TEXT[LANG]["HAS"] : SAME_DEFS.MSG__TEXT[LANG]["HAVE"]);
    preposition = ((location !== "") ? SAME_DEFS.MSG__TEXT[LANG]["IN"] : "");

    //Bulidning the message 
    MSG = [`${article} ${organization} ${preposition} ${location}${has} issued a ${event} valid until ${end}`]
       
    current_state = null;
    idx = 0;

    // For each FIPS code in message add by State: Countes, or all
    for (var item in PSSCCC) {
        [county, state] = county_decode(PSSCCC[item], COUNTRY);

        if ((current_state !== state)) {// Add All countys in each state
            DIVISION = get_division(PSSCCC[item].slice(1, 3), COUNTRY);
            var conjunction
            conjunction = ((idx === 0) ? "" : "and")
            output = `${conjunction} for the following ${DIVISION} in ${state}: `;
            MSG += [output];
            current_state = state;
        }
        // Convert it to a sentance and add it to the message
        var county, punc
        county = ((county !== state) ? county : "All".toUpperCase());
        punc = ((idx !== (PSSCCC.length - 1)) ? "," : ".")
        MSG += [`${county}${punc} `];
        idx += 1;
    }
    MSG += ["("+LLLLLLLL+")"];
    
    return MSG; // Give back the formatted message 
}
function same_decode(same) {
    var CA_bad_list, COUNTRY, EEE, JJJHHMM, LLLLLLLL, ORG, PSSCCC_list, S1, S2, STATION, TTTT, TYPE, US_bad_list, bad_list, ZCZC, county;

    // Remove the EAS: if not killed prior
    same = same.replace("EAS: ", "").toUpperCase().replace(" ", "");

    // Break apart the message according to ZCZC-ORG-EEE-PSSCCC+TTTT-JJJHHMM-TTTTTTT-
    [S1, S2] = same.split("+");
    [ZCZC, ORG, EEE] = S1.split("-").slice(0, 3);
    PSSCCC_list = S1.split("-").slice(3);
    [TTTT, JJJHHMM, LLLLLLLL] = S2.split("-", 3);
    LLLLLLLL = LLLLLLLL.replace("-", "");
    LLLLLLLL = LLLLLLLL.replace(/\s+/g, '');
    try {
        [STATION, TYPE] = LLLLLLLL.split("/");
    } catch (e) {
        STATION = LLLLLLLL;
        TYPE = null;
    }

    //Validate each PSSCCC or FIPS code, Also see if US or CA
    US_bad_list = [];
    CA_bad_list = [];
    for (var code in PSSCCC_list) {
        try {
            if ((code.slice(3) === "000")) {
                county = SAME_DEFS.US_SAME_AREA[code.slice(1, 3)];
            } else {
                county = SAME_DEFS.US_SAME_CODE[code.slice(1)];
            }
        } catch (e) {
           US_bad_list.append(code);
        }
        try {
            county = SAME_DEFS.CA_SAME_CODE[code.slice(1)];
        } catch (e) {
            CA_bad_list.append(code);
        }
    }

    //Remove any bad PSSCCC and Proced to format message
    COUNTRY = ((US_bad_list.length > CA_bad_list.length) ? "CA" : "US");
    bad_list = ((COUNTRY === "US") ? US_bad_list : CA_bad_list);
    for (var code in bad_list) {
        PSSCCC_list.remove(code);
    }
    PSSCCC_list.sort();
    return [readable_message(ORG, EEE, PSSCCC_list, TTTT, JJJHHMM, STATION, TYPE, LLLLLLLL, COUNTRY), STATION + "-" + ORG];
}

module.exports = {
   decode: function(message){
       return same_decode(message)
   }
}
//console.log(decode("ZCZC-WXR-EWW-031109-020209-020091-020121-029047-029165-029095-029037+0030-3650000-KOAX/NWS-"));
//console.log(same_decode("ZCZC-CIV-SPW-031000-029000+0030-3650000-KEAX/NWS-"));
//console.log(same_decode("ZCZC-EAS-CEM-031000-029000+0030-3650000-KWLA/AM-"));
//console.log(same_decode("ZCZC-PEP-CDW-031000-029000+0030-3650000-KLRO/FM-"));
//console.log(same_decode("ZCZC-EAN-EAN-000000-029000+0030-3650000-KUCV/FM-"));
