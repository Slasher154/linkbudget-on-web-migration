/**
 * Created by Dome on 6/27/14 AD.
 */
import { LinkRequests } from '/imports/api/link_requests';

Template.linkDetail.helpers({
    fwd() {
        let case_num = FlowRouter.getParam('case_num');
        let request = LinkRequests.findOne({ _id: FlowRouter.getParam('_id') });
        var cas = _.filter(request.results, function(item){
            return item.case_num == case_num;
        })[0];
        return cas.fwd;
    },
    rtn() {
        let case_num = FlowRouter.getParam('case_num');
        let request = LinkRequests.findOne({ _id: FlowRouter.getParam('_id') });
        var cas = _.filter(request.results, function(item){
            return item.case_num == case_num;
        })[0];
        return cas.rtn;
    }
})

Template.linkDetailTable.helpers({
    tableRows() {
        return ['Parameter','Value','Unit'];
    },
    summaryRows() {
        return ['C/N Total (dB)', 'MCG', 'Es/No Threshold (dB)','Eb/No Threshold (dB)','Link margin (dB)','Required Link margin (dB)', 'Status','Occ.BW (MHz)','Data Rate (Mbps)','Power Utilization (%)','Operating HPA Power (W)','UL Availability (%)','DL Availability (%)','Total Availability (%)'];
    }
})
