/**
 * Created by Dome on 4/21/14 AD.
 */
import '/imports/lib/util.js';
import { Satellites } from '/imports/api/satellites';

if (Meteor.isClient){

    Template.registerHelper('isSatelliteSelected', function(){
        return Session.get('isConventional') || Session.get('isBroadband');
    })
    Template.registerHelper('isConventional', function(){
        return Session.get('isConventional');
    })
    Template.registerHelper('isBroadband', function(){
        return Session.get('isBroadband');
    })
    Template.registerHelper('findBestChannel', function(){
        return Session.get('findBestChannel');
    })
    Template.registerHelper('isBeamSelected', function(){
        return Session.get('beam');
    })
    Template.registerHelper('isCountrySelected', function(){
        return Session.get('country');
    })
    Template.registerHelper('isCountryOrBeamSelected', function(){
        return Session.get('beam') || Session.get('country');
    })
    Template.registerHelper('recommendAntenna',function(){
        return Session.get('recommendAntenna');
    })
    Template.registerHelper('recommendBuc', function(){
        return Session.get('recommendBuc');
    })
    Template.registerHelper('findMaxContour', function(){
        return Session.get('findMaxContour');
    })
    Template.registerHelper('isConventionalPlatformSelected', function() {
        if(Session.get('selectedConventionalPlatform')){
            return true;
        }
        return false;
    })
    Template.registerHelper('isBc',function(){
        return Session.get('selectedConventionalPlatform') === 'BC';
    })
    Template.registerHelper('isBcPlatformSelected', function(){
        if(Session.get('selectedBcPlatform')){
            return true;
        }
        return false;
    })
    Template.registerHelper('hasSelectedLocs', function(){
        return Session.get('selectedLocations') && Session.get('selectedLocations').length > 0;
    })
    Template.registerHelper('selectedLocs', function(){
        return Session.get('selectedLocations');
    })
    Template.registerHelper('isModemSelected', function(){
        if(Session.get('modemId')){
            return true;
        }
        return false;
    })
    Template.registerHelper('isAnyPlatformSelected', function(){
        // return true if any broadcast platform (DVB-S1, DVB-S2) or modems (conventional VSAT, broadband satellites is selected
        return Session.get('selectedBcPlatform') || Session.get('modemId');
    })

    Template.registerHelper('joinString', function(string_arr){
        // join the array string
        return string_arr.join(',');
    })

    Template.registerHelper('isEqual', function(choice1, choice2){
        //return true if both choices are equal
        // console.log(choice1 + " equals to " + choice2 + " >> ");
        return choice1 == choice2;
    })

    Template.registerHelper('isNotEmpty', function(object){
        return !_.isEmpty(object);
    })

    Template.registerHelper('isNotEmptyArray', function(arr){
        return arr.length > 0;
    })
    Template.registerHelper('toDateString', function(date_in_milliseconds){
        return new Date(date_in_milliseconds).toLocaleString("en-GB"); // dd//mm/yyyy
    })

    // return Eb/No from given MCG object
    Template.registerHelper('ebNo', function(mcg){
        return (mcg.es_no - 10 * log10(mcg.spectral_efficiency)).toFixed(2);
    })

    // return true if logged in user is admin
    Template.registerHelper('isAdmin', function(){
        return IsAdmin(Meteor.userId());
    })

    // return true if given user Id is admin
    Template.registerHelper('isUserAdmin', function(userId){
        return IsAdmin(userId);
    })

    // return true if the given satellite is conventional
    Template.registerHelper('isConventionalSatellite', function(satellite){
        return Satellites.findOne({name:satellite}).type === "Conventional";
    })
}

function log10(num) {
    return Math.log(num) / Math.LN10;
}