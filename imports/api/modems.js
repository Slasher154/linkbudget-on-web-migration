/**
 * Created by thanatv on 19/03/14.
 */
import '/imports/lib/util.js';

export const Modems = new Mongo.Collection('modems');

Modems.allow({
    insert: function(userId, doc){
        var modem = Modems.findOne({name:doc.name});
        if(modem){
            throw new Meteor.Error(403, "This modem already exists in the database");
        }
        return IsAdmin(userId);
    },
    update: function(userId, doc, fields, modifier){
        return IsAdmin(userId);
    },
    remove: function(userId, doc){
        // Cannot delete standard modems
        if(doc.vendor === "Standard"){
            throw new Meteor.Error(403, "Cannot delete standard modems.");
        }
        return IsAdmin(userId);
    }

})