/**
 * Created by Dome on 7/29/14 AD.
 */
import '/imports/lib/util.js';

export const AntennaVendors = new Mongo.Collection('antenna_vendors');

AntennaVendors.allow({
    insert: function(userId, doc){
        var vendor = AntennaVendors.findOne({name:doc.name});
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
            throw new Meteor.Error(403, "Cannot delete standard antenna.");
        }
        return IsAdmin(userId);
    }

})