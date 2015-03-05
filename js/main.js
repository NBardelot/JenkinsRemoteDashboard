var config;
var processing = false;
var filtersRegex = new Array();

function loadConfig() {
    $.ajax("./json/config.json", {
        async: false,
        success: function(configJson) {
            config = configJson;
        }
    });
}

function setFooter() {
    var year = moment().year();
    $(".jenkins-remote-dashboard-footer").text("Copyright " + year + " Noël Bardelot");
}

function setupFilterRegex() {
    $.each(config.filters, function(i, filter) {
        filtersRegex[filtersRegex.length] = { "regex": new RegExp(filter.regex, filter.modifier), "keep": filter.keep };
    });
}

function selectIconByScore(score) {
    if (score >= config.icons.sunny_min_score) {
        return "./img/sunny.png";
    } else if (score >= config.icons.cloudy_min_score) {
        return "./img/cloudy.png";
    } else if (score >= config.icons.very_cloudy_min_score) {
        return "./img/very_cloudy.png";
    } else if (score >= config.icons.rainy_min_score) {
        return "./img/rainy.png";
    } else {
        return "./img/storm.png";
    }
}

function processJobDetails(job, weatherReport) {
    var healthReportDesc, healthReportScore, newReportName, newReportIcon, newReportValues, newReportData;

    newReportName = $("<a class='jenkins-remote-dashboard-report-name'></a>").text(job.name).attr("href", job.url);
    newReportIcon = $("<img class='jenkins-remote-dashboard-report-icon' />");
    newReportValues = $("<div class='jenkins-remote-dashboard-report-values'></div>");
    newReportData = $("<div class='jenkins-remote-dashboard-report-data'></div>").text(getI18N(config.app.language).Launched + " " + moment(job.lastBuild.timestamp).fromNow());
    newReportValues.append(newReportData);

    $.each(job.healthReport, function(i, healthReport) {
        healthReportDesc = healthReport.description.split(":")[1];
        healthReportDesc = healthReportDesc.substr(0, healthReportDesc.length - 1);
        if (typeof healthReportScore === "undefined" || healthReport.score < healthReportScore) {
            healthReportScore = healthReport.score;
            newReportIcon.attr("src", selectIconByScore(healthReportScore));
            newReportIcon.attr("alt", healthReportDesc);
            newReportIcon.attr("title", "score: " + healthReportScore);
        }
        newReportData = $("<div class='jenkins-remote-dashboard-report-data'></div>").text(healthReportDesc);
        newReportValues.append(newReportData);
    });

    weatherReport.append(newReportName);
    weatherReport.append(newReportIcon);
    weatherReport.append(newReportValues);
}

function hidePreviousReports() {
    if (config.animation.use_animation) {
        $(".jenkins-remote-dashboard-report").addClass("reverse-train-station-panel");
        $(".jenkins-remote-dashboard-report").one("animationend webkitAnimationEnd", function () {
            $(this).remove();
        });
    } else {
        $(".jenkins-remote-dashboard-report").remove();
    }
}

function createNewReports(status, nbPages, jobs, weatherMain) {
    $(".jenkins-remote-dashboard-pagination").text(status.page + " / " + nbPages);
    for (i = 0; i < config.app.reports_per_page && status.iter < jobs.length; ++i, status.iter += 1) {
        job = jobs[status.iter];
        if (job.buildable === true && job.lastBuild != null && job.healthReport.length > 0) {
            newReport = $("<div class='jenkins-remote-dashboard-report'></div>");
            if (config.animation.use_animation) {
                newReport.addClass("train-station-panel");
                newReport.one("animationend webkitAnimationEnd", function () {
                    $(this).removeClass("train-station-panel");
                });
            }
            processJobDetails(job, newReport);
            weatherMain.append(newReport);
        }
    }
    status.page += 1;
}

function showPage(status, nbPages, jobs, weatherMain) {
    hidePreviousReports();
    if (config.animation.use_animation) {
        return setTimeout(function(){
            createNewReports(status, nbPages, jobs, weatherMain);
        }, config.animation.duration_ms + 5); // 5ms delay to help smooth the change
    } else {
        createNewReports(status, nbPages, jobs, weatherMain);
    }
}

function filterJobs(jobs) {
    return $.grep(jobs, function(job, i) {
        var filtered = false;
        if (job.buildable != true) {
            return false;
        }
        if (job.lastBuild === null) {
            return false;
        }
        if (job.healthReport.length === 0) {
            return false;
        }
        $.each(filtersRegex, function(i, filter) {
            var testResult = filter.regex.test(job.name);
            if ((testResult === false && filter.keep === true) || (testResult === true && filter.keep === false)) {
                filtered = true;
                return;
            }
        });
        if (filtered === true) {
            return false;
        }
        return true;
    });
}

function processJenkinsState(jenkinsState) {
    var jobs, weatherMain, weatherReports, nbPages, newReport, job, intervalBetweenPages, timerBetweenPages, status;

    processing = true;
    jobs = filterJobs(jenkinsState.jobs);

    weatherMain = $(".jenkins-remote-dashboard-main");
    weatherReports = weatherMain.children(".jenkins-remote-dashboard-report");

    nbPages = Math.ceil(jobs.length / config.app.reports_per_page);
    intervalBetweenPages = Math.floor((config.app.interval - config.animation.duration_ms) / nbPages);
    status = {
        "page": 1,
        "iter": 0
    };
    showPage(status, nbPages, jobs, weatherMain);
    timerBetweenPages = setInterval(function() {
        if (status.page <= nbPages) {
            showPage(status, nbPages, jobs, weatherMain);
        } else {
            clearInterval(timerBetweenPages);
            processing = false;
        }
    }, intervalBetweenPages);
}

function getJenkinsState(url, parameters) {
    $.ajax({
        type: "GET",
        url: url,
        dataType: "jsonp",
        async: false,
        jsonp: "jsonp",
        data: parameters,
        beforeSend: function(jqXHR, settings) {
            jqXHR.withCredentials = true;
            jqXHR.setRequestHeader("Authorization", "Basic " + btoa(config.jenkins.authentication_user + ":" + config.jenkins.authentication_token));
        },
        success: function(jenkinsState) {
            processJenkinsState(jenkinsState);
            $(".jenkins-remote-dashboard-last-check").text(moment().calendar().toLowerCase());
        },
        error: function(exception) {
            console.log("Oops : " + exception);
        }
    });
}

function main() {
    loadConfig();
    setupFilterRegex();
    loadMomentLocale(config.app.language);
    setFooter();
    getJenkinsState(config.jenkins.url + config.jenkins.json_api, config.jenkins.api_options);
    setInterval(function() {
        if (!processing) {
            getJenkinsState(config.jenkins.url + config.jenkins.json_api, config.jenkins.api_options);
        }
    }, 500);
}

$(document).ready(main);