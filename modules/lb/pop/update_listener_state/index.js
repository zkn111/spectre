var commonModal = require('client/components/modal_common/index');
var config = require('./config.json');
var request = require('../../request');
var getErrorMessage = require('client/applications/dashboard/utils/error_message');
var __ = require('locale/client/dashboard.lang.json');

function pop(obj, parent, enableTrue, callback) {
  if(enableTrue) {
    config.title = ['enable', 'listener', 'status'];
    config.btn.value = 'enable';
    config.fields[0].info = __[config.fields[0].field].replace('{0}', __.enable);
  } else {
    config.title = ['disable', 'listener', 'status'];
    config.btn.value = 'disable';
    config.fields[0].info = __[config.fields[0].field].replace('{0}', __.disable);
  }
  config.fields[0].info = config.fields[0].info.replace('{1}', obj.name);
  config.btn.disabled = false;

  var props = {
    __: __,
    parent: parent,
    config: config,
    onInitialize: function(refs) {},
    onConfirm: function(refs, cb) {
      var listenerParam = {'admin_state_up': enableTrue};
      request.updateListener(obj.id, listenerParam).then(res => {
        callback && callback();
        cb(true);
      }).catch(function(error) {
        cb(false, getErrorMessage(error));
      });
    },
    onAction: function(field, status, refs) {}
  };

  commonModal(props);
}

module.exports = pop;