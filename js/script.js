$(document).ready(function () {
    var resourceWithError;
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
        if (resource.engineStatus.indexOf('ERROR') !== -1) return 'CloudCoreo';
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

    function goToView(view) {
        if (currentView === view) return;
        $('.resource-type-toggle .resource-type').removeClass('active');
        $('.' + currentView).addClass('hidden');
        $('.' + view).removeClass('hidden');
        $('.resource-type.' + view + '-res').addClass('active');
        currentView = view;
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
                    mapData[region] = { violations: 0, deployed: 0 };
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
                if (!alert.isViolation) return;
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
            var view = $(this).attr('value');
            goToView(view);
        });

        $('.close').click(function () {
            $(this).closest('#popup').addClass('hidden');
        });

        $('.backdrop').click(function () {
            $(this).closest('#popup').addClass('hidden');
        });

        $('.warning-link').click(function () {
            var rowWithError = $('.resource-row .view-row .name:contains(' + resourceWithError.resourceName + ')').parent();
            rowWithError.next('.expandable-row').removeClass('hidden');
            goToView('deploy');
        });
    }

    function emulateCcThisUpdate(data) {
        setTimeout(function() {
            d3.json("./tmp-data/tmp0.json", function (data) {
                init(data, false);
            });
        }, 5000);
    }

    function initView() {
        $('.is-executing').addClass('hidden');
        $('.resource-type-toggle .resource-type.' + viewTypes.deploy + '-res').removeClass('error');
        $('.resource-type-toggle .resource-type.' + viewTypes.audit + '-res').removeClass('alert');
    }

    function setupData(data, isFirstLoad) {
        if (isFirstLoad) {
            deployData = new Deploy(data);
            auditData = new Audit(data, 'level');
        } else {
            deployData.refreshData(data);
            auditData.refreshData(data);
        }
        renderMapData('level');
    }

    function setupViewData(isFirstLoad) {
        var violationCount = auditData.getViolationsCount();
        var warningBlock = $('.warning-block');

        if (violationCount) $('.resource-type-toggle .resource-type.' + viewTypes.audit + '-res').addClass('alert');
        warningBlock.removeClass('visible');

        if (deployData.hasErrors()) {
            $('.resource-type-toggle .resource-type.' + viewTypes.deploy + '-res').addClass('error');
            resourceWithError = deployData.getResourcesWithError();
            warningBlock.addClass('visible');
            $('.Disabled').addClass('hidden');
            $('.Enabled').addClass('hidden');
        }

        if (isFirstLoad) {
            currentView = !violationCount ? viewTypes.deploy : viewTypes.audit;
            $('.resource-type-toggle .resource-type.' + currentView + '-res').addClass('active');
            $('.' + currentView).removeClass('hidden');
        }
    }

    function checkExecutionStatus(data){
        if (data.engineState && data.engineState !== 'COMPLETED'){
            $('.is-executing').removeClass('hidden');
        }
    }

    function init(data, isFirstLoad) {
        setupHandlers();
        initView();
        setupData(data, isFirstLoad);
        setupViewData(isFirstLoad);
        checkExecutionStatus(data);
    }

    if (typeof ccThisCont === 'undefined') {
        d3.json("./tmp-data/tmp0.json", function (data) {
            init(data, true);
            // emulateCcThisUpdate(data);
        });
    } else {
        init(ccThisCont.ccThis, true);
        ccThisCont.watch('ccThis', function (id, oldValue, newValue) {
            init(newValue, false);
        });
    }
});