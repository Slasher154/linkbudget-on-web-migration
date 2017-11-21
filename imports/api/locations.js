/**
 * Created by Dome on 5/12/14 AD.
 */
import '/imports/lib/util.js';

export const Locations = new Mongo.Collection('locations');

Locations.allow({
    insert: function(userId, doc){
        var loc = Locations.findOne({name:doc.name});
        if(loc){
            throw new Meteor.Error(403, "This location already exists in the database.");
        }
        return IsAdmin(userId);
    },
    update: function(userId, doc, fields, modifier){
        return IsAdmin(userId);
    },
    remove: function(userId, doc){

        return IsAdmin(userId);
    }


})