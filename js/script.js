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
        if (resource.resourceType.indexOf('aws_advisor_') !== -1) return 'CloudCoreo';
        if (resource.resourceType.indexOf('aws_iam_') !== -1) return 'AWS';
        if (resource.resourceType.indexOf('aws_route53_') !== -1) return 'AWS';
        if (resource.resourceType.indexOf('uni_util_') !== -1) return 'CloudCoreo';

        if (resource.resourceType.indexOf('aws_ec2_') !== -1 ||
            resource.resourceType.indexOf('aws_elasticache_') !== -1 ||
            resource.resourceType.indexOf('aws_s3_') !== -1 ||
            resource.resourceType.indexOf('aws_vpc_') !== -1 ||
            resource.resourceType.indexOf('aws_vpn_') !== -1) {
            var found = resource.inputs.find(function (elem) {
                return elem.name === 'region'
            });
            if (found) return found.value;
        }

        return undefined;
    }

    function renderMapData(sortKey) {
        var resources = deployData.getResourcesList();
        if (!resources) return;
        var mapData = {};
        resources.forEach(function (resource) {
            var region = getRegion(resource);
            if (!region) return;

            if (region !== 'CloudCoreo') {
                if (!mapData[region]) {
                    mapData[region] = { violations: 0, deployed: 0, message: defMessage };
                }
                if (resource.dataType === 'ADVISOR_RESOURCE') ++mapData[region].violations;
                else ++mapData[region].deployed;
                return;
            }

            if (!mapData[region]) {
                mapData[region] = { violations: 0, deployed: 0, successMessage: 'Resource', errorMessage: 'Error' };
            }

            if (resource.engineStatus.indexOf('ERROR') !== -1) ++mapData[region].violations;
            else ++mapData[region].deployed;
        });

        var alerts = auditData.getViolationsList();
        if (alerts) {
            alerts.forEach(function (alert) {
                var region = alert.region;
                if (!mapData[region]) mapData[region] = { violations: 0, deployed: 0 };
                ++mapData[region].violations;
            });
        }

        if (mapData.CloudCoreo) {
            if (mapData.CloudCoreo.violations > 1) mapData.CloudCoreo.errorMessage += 's';
            if (mapData.CloudCoreo.deployed > 1) mapData.CloudCoreo.successMessage += 's';
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

        $(window).resize(function() {
            console.log($(this).width());
            if($(this).width() <= 600) {
                $('.resource-type-toggle .resource-type.map-res').removeClass('active');
                $('.resource-type-toggle .resource-type.audit-res').addClass('active');
                $('.map').addClass('hidden');
                $('.audit').removeClass('hidden');
            }

        });
    }

    function showLocalPopup() {
        $('#popup').removeClass('hidden');
    }

    function init(data) {
        setupHandlers();
        d3.json("./tmp-data/world-countries.json", function (collection) {
            deployData = new Deploy(data);
            auditData = new Audit(data.resourcesArray, 'level');
            renderMapData('level');

            var noViolations = !auditData.getViolationsList() || !auditData.getViolationsList().length;
            currentView = noViolations ? viewTypes.deploy : viewTypes.audit;
            if (!noViolations) $('.resource-type-toggle .resource-type.' + viewTypes.audit + '-res').addClass('alert');
            if (deployData.hasErrors()) $('.resource-type-toggle .resource-type.' + viewTypes.deploy + '-res').addClass('error');
            if (deployData.hasAlerts()) $('.resource-type-toggle .resource-type.' + viewTypes.deploy + '-res').addClass('alert');


            $('.resource-type-toggle .resource-type.' + currentView + '-res').addClass('active');
            $('.' + currentView).removeClass('hidden');
            $('#backdrop').addClass('hidden');
        });
    }

    if (typeof ccThisCont === 'undefined') {
        d3.json("./tmp-data/tmp2.json", function (data) {
            init(data)
        });
    } else {
        init(ccThisCont.ccThis);
        ccThisCont.watch('ccThis', function (id, oldValue, newValue) {
            init(newValue);
        });
    }
});