/**
 * Created by Dome on 4/25/14 AD.
 */
import { Modems } from '/imports/api/modems';

Template.modemDetails.helpers({
    modemId() {
        return Session.get('modemId');
    },
    apps() {
        var modem = Modems.findOne({_id:Session.get('modemId')})
        var apps = [];
        if(modem) {
            // Find forward application (for modem with Outbound/Inbound systems)
            var forward_app = _.find(modem.applications, function (item) {
                return item.type === "forward"
            });
            if (forward_app) {
                apps.push({
                    type: "Forward",
                    app: forward_app
                })
            }
            var return_app = _.find(modem.applications, function (item) {
                return item.type === "return"
            });
            if (return_app) {
                apps.push({
                    type: "Return",
                    app: return_app
                })
            }
            if (!(forward_app || return_app)) {
                // if this modem has no forward and return path, it means that it has one way broadcast or SCPC apps only
                var one_way_app = modem.applications[0];
                if (one_way_app) {
                    apps.push({
                        type: one_way_app.name,
                        app: one_way_app
                    })
                }
            }
        }
        return apps;
    },
    isAcm() {
        // return true if there is any app in this modem has ACM mode
        var modem = Modems.findOne({_id:Session.get('modemId'), 'applications.acm': true });
        console.log(modem);
        return modem != null;
    }
})
