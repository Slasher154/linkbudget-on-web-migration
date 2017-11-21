/**
 * Created by Dome on 5/22/14 AD.
 */
import '/imports/lib/util.js';

export const Antennas = new Mongo.Collection('antennas');

Antennas.allow({
    insert: function(userId, doc){
        var antenna = Antennas.findOne({name:doc.name});
        if(antenna){
            throw new Meteor.Error(403, "This antenna already exists in the database");
        }
        return IsAdmin(userId);
    },
    update: function(userId, doc, fields, modifier){
        return IsAdmin(userId);
    },
    remove: function(userId, doc){
        // Cannot delete standard modems
        if(doc.vendor === "Standard"){
            throw new Meteor.Error(403, "Cannot delete standard antenna.");
        }
        return IsAdmin(userId);
    }

})