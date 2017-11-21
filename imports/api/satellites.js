 /**
 * Created by thanatv on 7/03/14.
 */
 import '/imports/lib/util.js';

 export const Satellites = new Mongo.Collection('satellites');

Satellites.allow({
    insert: function(userId, doc){
        var sat = Satellites.findOne({name:doc.name});
        if(sat){
            throw new Meteor.Error(403, "This satellite already exists in the database.");
        }
        return IsAdmin(userId);
    },
    update: function(userId, doc, fields, modifier){
        return IsAdmin(userId);
    },
    remove: function(userId, doc){
        // cannot delete satellite if there is channel data associated with this satellite
        var channels = Channels.find({satellite: doc.name});
        if(channels){
            throw new Meteor.Error(403, "Cannot delete because there are channels associated with this satellite.");
        }
        return IsAdmin(userId);
    }


})