(function () {
  'use strict';

  var baseURL = 'https://secure.xivdb.com/tooltip';

  angular
    .module('ffxivCraftOptWeb.services.xivdbtooltips', [])
    .service('_xivdbtooltips', XIVDBTooltipsService);

  function XIVDBTooltipsService($rootScope, $q, _allActions, _allClasses, _actionsByName) {
    this.$rootScope = $rootScope;
    this.$q = $q;
    this._allActions = _allActions;
    this._allClasses = _allClasses;
    this._actionsByName = _actionsByName;

    this.actionTooltips = {};
  }

  XIVDBTooltipsService.$inject = ['$rootScope', '$q', '_allActions', '_allClasses', '_actionsByName'];

  XIVDBTooltipsService.prototype.loadTooltips = function (lang) {
    var actions = [];
    for (var i = 0; i < this._allActions.length; i++) {
      var action = this._allActions[i];
      if (action.skillID) {
        if (action.cls == 'All') {
          for (var j = 0; j < this._allClasses.length; j++) {
            var cls = this._allClasses[j];
            actions.push({shortName: action.shortName, cls: cls, skillID: action.skillID[cls]});
          }
        }
        else {
          actions.push({shortName: action.shortName, cls: action.cls, skillID: action.skillID[action.cls]});
        }
      }
    }

    return this._fetch(actions, lang).then(function (response) {
      var newTooltips = {};
      var actionsBySkillID = response.config.actionsBySkillID;
      var xivdbActions = response.data.action;
      for (var i = 0; i < xivdbActions.length; i++) {
        var xivdbAction = xivdbActions[i];
        var action = actionsBySkillID[xivdbAction.data.id];
        newTooltips[action.cls + action.shortName] = xivdbAction.html;
      }
      this.actionTooltips = newTooltips;
      this.$rootScope.$broadcast("tooltipCacheUpdated");
    }.bind(this));
  };

  XIVDBTooltipsService.prototype._fetch = function (actions, lang) {
    var url = baseURL + '?language=' + lang;
    var ids = actions.map(function (action) { return action.skillID });
    url += '&list[action]:=' + ids.join(',');

    var actionsBySkillID = {};
    for (var i = 0; i < actions.length; i++) {
      actionsBySkillID[actions[i].skillID] = actions[i];
    }

    // We can't use the $http module because each HTTP response triggers a digest update, which
    // causes significant lag when the app is loading because we're caching a couple hundred tooltips.
    var deferred = this.$q.defer();
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        deferred.resolve({
          config: {
            actionsBySkillID: actionsBySkillID
          },
          data: xhr.response
        });
      }
    };
    xhr.responseType = "json";
    xhr.open("GET", url, true);
    xhr.send();

    return deferred.promise;
  };


})();
