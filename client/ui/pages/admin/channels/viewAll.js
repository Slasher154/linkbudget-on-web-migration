/**
 * Created by Dome on 7/7/14 AD.
 */
import { Satellites } from '/imports/api/satellites';
import { Channels } from '/imports/api/channels';

Template.channelViewAll.rendered = function(){
    Session.set('view_satellites','Thaicom 5');
}

Template.channelViewAll.helpers({
    tableRows() {
        return ['Name','UL CF (GHz)','DL CF (GHz)','BW (MHz)','UL Beam','DL Beam','UL Pol','DL Pol','Saturated EIRP Peak (dBW)','G/T Peak (dB/K)','Transponder','Mode','SFD (dBW/m^2)','Dynamic Range (dB)','Designed Deepin (dB)','Atten.Range (dB)','Default Atten (dB)','TP.Status','Backoff settings (IBO,OBO,Intermod)'];
    },
    satellites() {
        var sats = Satellites.find().fetch();
        return _.map(sats, function(item){
            return {
                value: item.name,
                text: item.name
            }
        });
    },
    channels() {
        return Channels.find({satellite:Session.get('view_satellites')}).fetch();
    }
})

