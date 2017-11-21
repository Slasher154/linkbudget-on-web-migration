/**
 * Created by Dome on 7/14/14 AD.
 */

Template.forwardResultTable.helpers({
    tableRows() {
        var rows = [
            "Beam",
            "Downlink Location",
            "Antenna Size (m)",
            "Occupied Bandwidth (MHz)",
            "MCG Clear Sky",
            "EBE Clear Sky (bps/Hz)",
            "Data Rate Clear Sky (Mbps)",
            "MCG Rain Fade",
            "EBE Rain Fade (bps/Hz)",
            "Data Rate Rain Fade (Mbps)",
            "Total Link Availability (%)",
            "Pass/Fail"
        ];
        if(IsAdmin(Meteor.userId())){
            rows.push("Detail");
        }
        // Add table row for IPSTAR platform only
        if(Session.get('result_platform') == 'IPSTAR'){
            rows.splice(7,0,'Data rate per IPSTAR channel Clear Sky (Mbps)');
            rows.splice(11,0, 'Data rate per IPSTAR channel Rain Fade (Mbps)')
        }
        return rows;
    },
    isToll() {
        return Session.get('result_platform') == 'IPSTAR';
    },

    rowClass(pass) {
        if(pass) {return ""}
        else {return "danger";}
    },

})

Template.returnResultTable.helpers({
    tableRows() {
        var rows = [
            "Beam",
            "Uplink Location",
            "Antenna Size (m)",
            "BUC (W)",
            "Occupied Bandwidth (MHz)",
            "MCG Clear Sky",
            "EBE Clear Sky (bps/Hz)",
            "Data Rate Clear Sky (Mbps)",
            "MCG Rain Fade",
            "EBE Rain Fade (bps/Hz)",
            "Data Rate Rain Fade (Mbps)",
            "Total Link Availability (%)",
            "Pass/Fail"
        ];
        if(IsAdmin(Meteor.userId())){
            rows.push("Detail");
        }
        return rows;
    },
    rowClass() {
        if(pass) {return ""}
        else {return "danger";}
    }
})



