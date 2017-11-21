/**
 * Created by Dome on 7/1/14 AD.
 */
import '/imports/lib/util.js';

export const ModemVendors = new Mongo.Collection('modem_vendors');

ModemVendors.allow({
    insert: function(userId, doc){
        var vendor = ModemVendors.findOne({name:doc.name});
        if(vendor){
            throw new Meteor.Error(403, "This vendor already exists in the database");
        }
        return IsAdmin(userId);
    },
    update: function(userId, doc, fields, modifier){
        return IsAdmin(userId);
    },
    remove: function(userId, doc){
        // Cannot delete standard modems
        if(doc.name === "Standard"){
            throw new Meteor.Error(403, "Cannot delete standard modems.");
        }
        return IsAdmin(userId);
    }

})