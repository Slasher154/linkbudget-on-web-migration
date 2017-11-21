/**
 *
 * Created by Dome on 4/21/14 AD.
 */
import { Channels } from '/imports/api/channels';

Template.conventionalChannels.channels = function(){
    var beam = Session.get('beam');
    if(!beam){
        return [];
    }
    var channels = Channels.find({satellite:Session.get('satellite').name,uplink_beam:beam},{fields:{name:1}}).fetch();
    return {
        value: _.uniq(_.pluck(channels,'name'))
    }
}
