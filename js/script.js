$(document).ready(function () {
    var auditData;
    var deployData;
    var map;

    var viewTypes = {
        deploy: 'deploy',
        audit: 'audit',
        map: 'map'
    };

    var currentSortBy = {
        deploy: 'Most Recent',
        audit: 'Severity Level',
        map: ''
    };

    var currentView;

    var externalActions = {
        redirectToCommunityComposites: 'redirectToCommunityComposites',
        showViolationMoreInfo: 'showViolationMoreInfo',
        showViolationResources: 'showViolationResources',
        shareViolation: 'shareViolation',
        showFullResourceData: 'showFullResourceData'
    };

    function getRegion(resource) {
        if (resource.resourceType.indexOf('aws_advisor_alert') !== -1) return 'CloudCoreo';
        if (resource.resourceType.indexOf('aws_iam_') !== -1) return 'AWS';
        if (resource.resourceType.indexOf('aws_route53_') !== -1) return 'AWS';
        if (resource.resourceType.indexOf('uni_util_') !== -1) return 'CloudCoreo';

        return undefined;
    }

    function renderMapData(sortKey) {
        var resources = deployData.getResourcesList();
        if (!resources) return;
        var mapData = {};

        resources.forEach(function (resource) {
            var region = getRegion(resource);
            if(!region) return;

            if (!mapData[region]) mapData[region] = { violations: 0, deployed: 0};
            if (resource.dataType === 'ADVISOR_RESOURCE') ++mapData[region].violations;
            else ++mapData[region].deployed;
        });

        var alerts = auditData.getViolationsList();
        if (alerts) {
            alerts.forEach(function (alert) {
                var region = alert.region;
                if (!mapData[region]) mapData[region] = {violations: 0, deployed: 0};
                ++mapData[region].violations;
            });
        }
        staticMaps(mapData);
    }

    function setupHandlers() {
        $('.resource-type-toggle .resource-type').click(function (e) {
            var inputValue = $(this).attr('value');
            if (currentView === inputValue) return;
            $('.' + currentView).addClass('hidden');
            $('.' + inputValue).removeClass('hidden');
            currentView = inputValue;

            if (inputValue) {
                $('.resource-type-toggle .resource-type').removeClass('active');
                $(this).addClass('active');
            }
        });

        $('.close').click(function () {
            $(this).closest('#popup').addClass('hidden');
        });

        $('.backdrop').click(function () {
            $(this).closest('#popup').addClass('hidden');
        });
    }

    function showLocalPopup() {
        $('#popup').removeClass('hidden');
    }

    function init(data) {
        setupHandlers();
        d3.json("./tmp-data/world-countries.json", function (collection) {
            deployData = new Deploy(data);
            auditData = new Audit(data, 'level');
            renderMapData('level');

            var noViolations = !auditData.getViolationsList() || !auditData.getViolationsList().length;
            currentView = noViolations ? viewTypes.deploy : viewTypes.audit;
            if (!noViolations) $('.resource-type-toggle .resource-type.'+viewTypes.audit+'-res').addClass('alert');
            if (deployData.hasErrors()) $('.resource-type-toggle .resource-type.'+viewTypes.deploy+'-res').addClass('error');
            if (deployData.hasAlerts()) $('.resource-type-toggle .resource-type.'+viewTypes.deploy+'-res').addClass('alert');


            $('.resource-type-toggle .resource-type.' + currentView + '-res').addClass('active');
            $('.' + currentView).removeClass('hidden');
            $('#backdrop').addClass('hidden');
        });
    }

    if (typeof ccThisCont === 'undefined') {
        d3.json("./tmp-data/tmp.json", function (data) {
            init(data)
        });
    } else {
        init(ccThisCont.ccThis);
        ccThisCont.watch('ccThis', function (id, oldValue, newValue) {
            init(newValue);
        });
    }
});