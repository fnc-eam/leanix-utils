var oauth2_token;
var factsheets;
var instance = config_instance
var base_path = config_basePathLeanIX

// default values
var environment = "PROD";
var daysHighlight = 1;
var daysDisplay = 4;
var factSheetTypeValue= "All";

var settings;

var searchstring;

// initialize date picker
$(document).ready(function(){
    //reference to date picker with id "date"
    $('input[name="date"]').datepicker({
        format: 'yyyy-mm-dd',
        container: $('#datePicker'),
        todayHighlight: true,
        autoclose: true,
    });

    //display the default date
    var defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate()-daysDisplay);
    defaultDate.setHours(0,0,0,0);
    var month = defaultDate.getMonth()+1;
    month = (month >9?'':'0') + month;
    var day = defaultDate.getDate();
    day = (day>9?'':'0') + day;

    $('#date').val(defaultDate.getFullYear() + "-" + month + "-" + day);
})



function getFactSheets(cursor = ""){
    //clear list
    var pagesize = 50;

    // build query depending on selected factSheetType
    query = '{"query": "{allFactSheets(first:' + pagesize + ', ' + cursor + 'sort: [{key: \\"updatedAt\\", order: desc}], filter: {responseOptions:{maxFacetDepth:5},facetFilters:[{facetKey:\\"TrashBin\\",operator:OR,keys:[\\"archived\\", \\"active\\"]}' + (factSheetTypeValue == "All" ? '' : ', {facetKey: \\"FactSheetTypes\\", operator: OR, keys: [\\"' + factSheetTypeValue + '\\"]}') + ']}) { totalCount pageInfo { hasNextPage endCursor } edges { node { id displayName type updatedAt}}}}"}';

    // set parameter for post request
    setSettings(query);

    //wait for asynchronous response & process received data
    $.ajax(settings).done(function (response) {
        var completed = false;
        factsheets = response["data"]["allFactSheets"]["edges"];
        console.log("Loaded " + factsheets.length + " factsheets.");

        //show loading spinner so that user is aware of the script loading additional factsheets
        document.getElementById('loading').innerHTML = "Loading more factsheets...";
        document.getElementById('loading').classList.remove('label-success');
        document.getElementById('loading').classList.add('label-warning');
        document.getElementById("loadingSpinner").style.display = "";
        document.getElementById("finishedLoading").style.display = "none";


        // as an example, I am adding each application to the list in the html body so that we see something.
        $.each(factsheets, function(k, factsheet){
            idvalue=factsheet["node"]["id"];
            var fsType = factsheet["node"]["type"];

            // display data depending on last update
            var lastUpdatedTimestamp=factsheet["node"]["updatedAt"];
            var datestr = lastUpdatedTimestamp.substring(0, 10);
            var updatedDate=new Date(datestr);
            var todaysDate = new Date();
            var diffDays=daysdifference(todaysDate,updatedDate);


            //prepare displaying data & link to log events
            if(diffDays>daysDisplay) {
                completed = true;
                $('#factSheets').append("<li class='list-group-item'>• end of list •</li>");
                //let the user know that the process is done
                document.getElementById('loading').innerHTML = "All factsheets loaded"
                document.getElementById('loading').classList.remove('label-warning');
                document.getElementById('loading').classList.add('label-success');
                document.getElementById("loadingSpinner").style.display = "none";
                document.getElementById("finishedLoading").style.display = "";
                return false;
            }

            var workspace = environment=="PROD"?config_ws_production:config_ws_training;
            $('#factSheets').append("" +
                "<li class='list-group-item'><span class='shortLabel " +
                factsheet["node"]["type"] + "'>" + factsheet["node"]["type"][0] +
                "</span><a href='"+config_instance+"/"+workspace+"/factsheet/"+fsType+"/"+idvalue+"' target='_blank'>" +
                factsheet["node"]["displayName"] + "</a><ul id='" + idvalue + "'></ul></li>");
            $('#'+idvalue).empty();

            var relevantLogEventsFound = getLastUpdateDetails(idvalue);
            if (!relevantLogEventsFound){
                var fsName = factsheet["node"]["displayName"].toLowerCase();
                if (searchstring && fsName.indexOf(searchstring.toLowerCase()) == -1){
                    $('#'+idvalue).parent().hide();
                }
            }

        })

        if (response["data"]["allFactSheets"]["pageInfo"]["hasNextPage"] == true && !completed) {
            getFactSheets('after: \\"' + response["data"]["allFactSheets"]["pageInfo"]["endCursor"] + '\\", ');
        }
    });
}

function getLastUpdateDetails(idvalue, cursor = ""){
    idvalue=idvalue.replace(/"/g, '');
    var pagesize = 50;

    query = '{"query": "{allLogEvents (first:' + pagesize + ', ' + cursor + 'factSheetId:'+'\\"'+idvalue+'\\"'+') {pageInfo { hasNextPage endCursor } edges{node{id eventType path oldValue newValue message secondsPast createdAt user{id firstName lastName displayName email}}}}}"}'
    setSettings(query)

    $.ajax(settings).done(function (response) {
        logEvents = response["data"]["allLogEvents"]["edges"];
        var completed = false;
        var idsToShow = [];

        $.each(logEvents, function(k, logEvent){
            updatedDate=logEvent["node"]["createdAt"];
            updatedDate = updatedDate.substring(0, 10);
            updatedDate=new Date(updatedDate);
            var todaysDate = new Date();
            var diffDays=daysdifference(todaysDate,updatedDate);

            if(diffDays>daysDisplay){
                var index = logEvents.indexOf(logEvent);
                logEvents.splice(index,1);
                completed = true;
                return false;
            }
            var createdTime = new Date(logEvent["node"]["createdAt"]);
            var days = Math.floor((new Date() - createdTime) / (1000 * 60 * 60 * 24));
            var message = logEvent["node"]["message"];

            var factSheetTypes = ["Project", "Application", "ITComponent", "TechnologyStack", "TechnicalStack", "Provider", "UserGroup", "BusinessCapability", "DataObject", "Interface", "Process"];

            $.each(factSheetTypes, function(l, type){
                tinylabel = '<span class=\'tinyLabel ' + type + '\'>'+ type[0] + '</span>';

                regExp = new RegExp("^Relation 'rel.*" + type + "'");
                if (message.match(regExp)) {
                    message = message.replace(/Relation '.*' switched - relation pointing to '(.*)' changed to '(.*)'.*/, tinylabel + '<font style="text-decoration:line-through;">$1</font> ➧ $2');
                }

                regExp = new RegExp(" - path 'rel.*" + type + "'");
                if (message.match(regExp)) {
                    message = message.replace(/Relation to '(.*)' removed.*/, '<font style="text-decoration:line-through;">$1</font>');
                    message = message.replace(/Added relation to '(.*)' - path.*/, '$1');
                    message = message.replace(/Relation to '(.*)' added.*/, '$1');
                    message = message.replace(regExp, '');
                    message = tinylabel + message;
                }

                regExp = new RegExp("path 'rel.*" + type + "'");
                if (message.match(regExp)) {
                    message = message.replace(/Relation to '(.*)' updated.* changed field '(.*)': '([\s\S]*)' -> '([\s\S]*)'.*/, tinylabel + '$1: changed $2: <font style="text-decoration:line-through;">$3</font> ➧ $4');
                }
            })

            if (message.match(/Added Tag '.*'/)) {
                message = message.replace(/Added Tag '(.*)'/, '<span class=\'tag\'>$1</span>');
            }
            if (message.match(/Removed Tag '.*'/)) {
                message = message.replace(/Removed Tag '(.*)'/, '<span class=\'tag-delete\'>$1</span>');
            }
            if (message.match(/^Updated field '.*'/)) {
                message = message.replace(/Updated field '\/(.*)': '([\s\S]*)' -> '([\s\S]*)'/, '$1: <font style="text-decoration:line-through;">$2</font> ➧ $3');
            }

            //match searchstring to factsheet name and log event
            var fsName = $('#'+idvalue).parent().text().toLowerCase();
            if (searchstring && fsName.indexOf(searchstring.toLowerCase()) == -1 && JSON.stringify(logEvent).indexOf(searchstring.toLowerCase()) == -1 && !idsToShow.includes(idvalue)){
                //hide if searchstring is not matching both: factsheet name and content of log event
                $('#'+idvalue).parent().hide();
            }else{
                $('#'+idvalue).parent().show();
                //save id to "positive list" so that entire factsheet will not be disabled when the next related log event is loaded
                idsToShow.push(idvalue);
            }

            $('#'+idvalue).append("<li>" + (days < daysHighlight ? "<strong><font color='#669966'>✸new</font></strong>&nbsp;&nbsp;" : '') + timeSince(createdTime) + " ago - " + logEvent["node"]["user"]["displayName"] + " - "+ message + "</li>");
        })

        //match factsheet name to searchstring if there are no log events
        if(logEvents.length == 0){
            var fsName = $('#'+idvalue).parent().text().toLowerCase();
            if (searchstring && fsName.indexOf(searchstring.toLowerCase()) == -1){
                $('#'+idvalue).parent().hide();
            }
        }

        if (response["data"]["allLogEvents"]["pageInfo"]["hasNextPage"] == true && !completed) {
            getLastUpdateDetails(idvalue, 'after: \\"' + response["data"]["allLogEvents"]["pageInfo"]["endCursor"] + '\\", ');
        }
    });
}


///////////// FORM INPUT ///////////////////////

function setDaysDisplay(fromDate){
    daysDisplay = daysdifference(new Date(), new Date(fromDate));
    getOAuthToken(environment);
}

function setFactSheetType(type) {
    factSheetTypeValue = type.value;
    getOAuthToken(environment);
}

function searchEntries(){
    var input, factsheetlist, factsheet, i;

    //get factsheet list
    factsheetlist = document.getElementById("factSheets");
    if(factsheetlist){
        factsheet = factsheetlist.getElementsByClassName("list-group-item");

        //get search value
        input = document.getElementById('searchInput');
        searchstring = input.value.toUpperCase();

        //look at all factsheets
        for (i = 0; i < factsheet.length; i++) {
            if (!searchstring){
                factsheet[i].style.display = "";
                //$("li").show();
            }else {
                if (searchstring && factsheet[i].innerHTML.toUpperCase().indexOf(searchstring) > -1) {
                    factsheet[i].style.display = "";
                } else {
                    //hide factsheet which does not contain searchstring
                    factsheet[i].style.display = "none";
                }
            }
        }

    }

}

//////////// DATE / TIME UTILS //////////////////

function timeSince(d) {
    var s = Math.floor((new Date() - d) / 1000);
    var i = Math.floor(s / 31536000);

    if (i > 0) return i + " years";
    i = Math.floor(s / 2592000);
    if (i > 0) return i + " months";
    i = Math.floor(s / 86400);
    if (i > 0) return i + " days";
    i = Math.floor(s / 3600);
    if (i > 0) return i + " hours";
    i = Math.floor(s / 60);
    if (i > 0) return i + " minutes";
    return Math.floor(s) + " seconds";
}

function daysdifference(firstDate, secondDate) {
    firstDate.setHours(0,0,0,0);
    secondDate.setHours(0,0,0,0);
    var millisecondsPerDay=1000*60*60*24;
    var difference_ms = firstDate.getTime() - secondDate.getTime();
    return Math.round(difference_ms/millisecondsPerDay);
}

/////////// AUTHENTICATION /////////////////////

function getOAuthToken(env) {
    window.stop();

    environment = env
    console.log("Requesting OAuth2 token...");

    var apiToken = {
        "TRAIN": config_apiTokenTrain,
        "PROD":  config_apiTokenProd
    }

    var auth = btoa("apitoken:" +  apiToken[env]);
    var settings = {
        "async": true,
        "url": instance + config_tokenPathLeanIX,
        "method": "POST",
        "headers": {
            "authorization": "Basic " + auth,
        },
        "data": {
            "grant_type": "client_credentials"
        }
    }
    $.ajax(settings).done(function (response) {
        oauth2_token = response["access_token"];
        console.log("Token received: " + oauth2_token);
        $('#token')[0].value = oauth2_token;

        $('#factSheets').empty();
        getFactSheets();
    });
}

function copyOAuthToken() {
    var text = $('#token')[0];
    text.select();

    try {
        document.execCommand('copy');
    } catch (err) {
        console.log('Unable to copy token.');
    }
}

function setSettings(query){
    settings = {
        async: true,
        contentType: 'application/json',
        url: instance + base_path + "/graphql",
        method: "POST",
        headers: {
            authorization: "Bearer " + oauth2_token,
        },
        data: query
    }
}