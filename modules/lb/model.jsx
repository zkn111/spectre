require('./style/index.less');

var React = require('react');
var Main = require('client/components/main/index');

//detail component
var BasicProps = require('client/components/basic_props/index');

//sub module used in listener tab of detail page
var ListenerList = require('./listener_list');

//pop modals
var deleteModal = require('client/components/modal_delete/index');
var createLb = require('./pop/create_lb/index');
var assocFip = require('./pop/assoc_fip/index');
var dissocFip = require('./pop/dissoc_fip/index');
var createListener = require('./pop/create_listener/index');
var updateListenerState = require('./pop/update_listener_state/index');

var config = require('./config.json');
var __ = require('locale/client/dashboard.lang.json');
var request = require('./request');
var router = require('client/utils/router');
var getStatusIcon = require('../../utils/status_icon');
var notify = require('client/applications/dashboard/utils/notify');

class Model extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      config: config
    };

    ['onInitialize', 'onAction'].forEach((m) => {
      this[m] = this[m].bind(this);
    });
  }

  componentWillMount() {
    var columns = this.state.config.table.column;
    this.tableColRender(columns);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.props.style.display === 'none' && !nextState.config.table.loading) {
      return false;
    }
    return true;
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.style.display !== 'none' && this.props.style.display === 'none') {
      if (this.state.config.table.loading) {
        this.loadingTable();
      } else {
        this.getTableData(false);
      }
    }
  }

  tableColRender(column) {
    column.map(col => {
      switch (col.key) {
        case 'name':
          break;
        default:
          break;
      }
    });
  }

  onInitialize(params) {
    this.getTableData(false);
  }

  getTableData(forceUpdate, detailRefresh) {
    request.getList(forceUpdate).then(res => {
      var table = this.state.config.table;
      table.data = res;
      table.loading = false;

      var detail = this.refs.dashboard.refs.detail;
      if (detail && detail.state.loading) {
        detail.setState({
          loading: false
        });
      }

      this.setState({
        config: config
      }, () => {
        if (detail && detailRefresh) {
          detail.refresh();
        }
      });

    });
  }

  onAction(field, actionType, refs, data) {
    switch (field) {
      case 'btnList':
        this.onClickBtnList(data.key, refs, data);
        break;
      case 'table':
        this.onClickTable(actionType, refs, data);
        break;
      case 'detail':
        this.onClickDetailTabs(actionType, refs, data);
        break;
      default:
        break;
    }
  }

  refresh(data, forceUpdate) {
    if (data) {
      var path = router.getPathList();
      if (path[2]) {
        if (data.detailLoading) {
          this.refs.dashboard.refs.detail.loading();
        }
      } else {
        if (data.tableLoading) {
          this.loadingTable();
        }
        if (data.clearState) {
          this.refs.dashboard.clearState();
        }
      }
    }

    this.getTableData(forceUpdate, data ? data.detailRefresh : false);
  }

  loadingTable() {
    var _config = this.state.config;
    _config.table.loading = true;

    this.setState({
      config: _config
    });
  }

  onClickBtnList(key, refs, data) {
    var {rows} = data;

    switch(key) {
      case 'create':
        createLb();
        break;
      case 'assoc_fip':
        assocFip();
        break;
      case 'dissoc_fip':
        dissocFip();
        break;
      case 'delete':
        deleteModal({
          __: __,
          action: 'delete',
          type: 'lb',
          data: rows,
          onDelete: function(_data, cb) {
            request.deleteLb(rows[0]).then(res => {
              cb(true);
            });
          }
        });
        break;
      case 'refresh':
        this.refresh({
          tableLoading: true,
          detailLoading: true,
          clearState: true,
          detailRefresh: true
        }, true);
        break;
      default:
        break;
    }
  }

  onClickTable(actionType, refs, data) {
    switch (actionType) {
      case 'check':
        this.onClickTableCheckbox(refs, data);
        break;
      default:
        break;
    }
  }

  onClickTableCheckbox(refs, data) {
    var {rows} = data,
      btnList = refs.btnList,
      btns = btnList.state.btns;

    btnList.setState({
      btns: this.btnListRender(rows, btns)
    });
  }

  btnListRender(rows, btns) {
    for(let key in btns) {
      switch (key) {
        case 'delete':
          btns[key].disabled = rows.length === 1 ? false : true;
          break;
        default:
          break;
      }
    }

    return btns;
  }

  onClickDetailTabs(tabKey, refs, data) {
    var {rows} = data;
    var detail = refs.detail;
    var contents = detail.state.contents;
    var syncUpdate = true;

    var isAvailableView = (_rows) => {
      if (_rows.length > 1) {
        contents[tabKey] = (
          <div className="no-data-desc">
            <p>{__.view_is_unavailable}</p>
          </div>
        );
        return false;
      } else {
        return true;
      }
    };

    switch(tabKey) {
      case 'description':
        if (isAvailableView(rows)) {
          var basicPropsItem = this.getBasicPropsItems(rows[0]);
          contents[tabKey] = (
            <div>
              <BasicProps
                title={__.basic + __.properties}
                defaultUnfold={true}
                tabKey={'description'}
                items={basicPropsItem}
                rawItem={rows[0]}
                onAction={this.onDetailAction.bind(this)}
                dashboard={this.refs.dashboard ? this.refs.dashboard : null} />
            </div>
          );
        }
        break;
      case 'listener':
        if (isAvailableView(rows)) {
          request.getRelatedListeners(rows[0].listeners).then(res => {
            contents[tabKey] = (
              <ListenerList
                title={__.listener + __.list}
                tabKey={'listener'}
                rawItem={data.rows[0]}
                listenerConfigs={this.getListenerConfigs(res)}
                onAction={this.onDetailAction.bind(this)}
                defaultUnfold={true} />
            );
            detail.setState({
              contents: contents,
              loading: false
            });
          });
        }
        break;
      default:
        break;
    }

    if (syncUpdate) {
      detail.setState({
        contents: contents,
        loading: false
      });
    }
  }

  getBasicPropsItems(item) {
    var items = [{
      title: __.name,
      content: item.name || '(' + item.id.slice(0, 8) + ')',
      type: 'editable'
    }, {
      title: __.id,
      content: item.id
    }, {
      title: __.ip_address,
      content: item.vip_address
    }, {
      title: __.desc,
      content: item.description
    }];

    return items;
  }

  onDetailAction(tabKey, actionType, data, moreBtnKey) {
    switch (tabKey) {
      case 'description':
        this.onDescriptionAction(actionType, data);
        break;
      case 'listener':
        this.onListenerAction(actionType, data, moreBtnKey);
        break;
      default:
        break;
    }
  }

  onDescriptionAction(actionType, data) {
    switch (actionType) {
      case 'edit_name':
        var {rawItem, newName} = data;
        request.editLbaasName(rawItem, newName).then((res) => {
          notify({
            resource_type: 'lb',
            stage: 'end',
            action: 'modify',
            resource_id: rawItem.id
          });
          this.refresh({
            detailRefresh: true
          }, true);
        });
        break;
      default:
        break;
    }
  }

  getListenerConfigs(items) {
    var configs = [];
    var wordsToLine = function(data) {
      var value = '';
      data.forEach(ele => {
        value += __[ele];
      });

      return value;
    };
    var getlistenerDropdown = function(item) {
      var dropdown = [{
        items: [{
          title: __.modify,
          key: 'modify'
        }, {
          title: __.enable,
          key: 'enable',
          disabled: item.admin_state_up
        }, {
          title: __.disable,
          key: 'disable',
          disabled: !item.admin_state_up
        }, {
          title: wordsToLine(['dissociate', 'default', 'resource_pool']),
          key: 'dissoc_pool',
          disabled: item.default_pool_id ? false : true
        }, {
          title: __.delete,
          key: 'delete',
          danger: true
        }]
      }];

      return dropdown;
    };
    var getPolicyDropdown = function(item) {
      var dropdown = [{
        items: [{
          title: __.modify,
          key: 'modify'
        }, {
          title: __.enable,
          key: 'enable'
        }, {
          title: __.disable,
          key: 'disable'
        }, {
          title: __.delete,
          key: 'delete',
          danger: true
        }]
      }];

      return dropdown;
    };
    var getListenerDetail = function(item) {
      var itemDetail = [{
        feild: __.protocol,
        value: item.protocol
      }, {
        feild: __.protocol_port,
        value: item.protocol_port
      }, {
        feild: __.connection_limit,
        value: item.connection_limit === -1 ? __.infinity : item.connection_limit
      }, {
        feild: wordsToLine(['default', 'resource_pool']),
        value: item.default_pool_id ? '(' + item.default_pool_id.slice(0, 8) + ')' : '-'
      }, {
        feild: __.enabled_state,
        value: item.admin_state_up ? __.enabled : __.disabled
      }];

      return itemDetail;
    };
    var getPolicyTable = function(item) {return [];};
    var getPolicyItems = function(item) {return [];};

    items.map((item, i) => {
      configs.push({listener: item});
      configs[i].assocPoolDisabled = item.default_pool_id ? true : false;
      configs[i].listenerDropdown = getlistenerDropdown(item);
      configs[i].listenerDetail = getListenerDetail(item);
      if(item.protocol === 'HTTP') {
        configs[i].policyDropdown = getPolicyDropdown(item);
        configs[i].policyTable = getPolicyTable(item);
        configs[i].policyItems = getPolicyItems(item);
      }
    });

    return configs;
  }

  //detail listener btn onClick handler
  onListenerAction(actionType, data, moreBtnKey) {
    switch (actionType) {
      case 'create_listener':
        createListener(data.rawItem, null, false);
        break;
      case 'assoc_pool':
        //create pool then associate
        break;
      case 'add_policy':
        break;
      case 'more_listener_ops':
        this.onClickListenerMoreBtn(moreBtnKey, data);
        break;
      case 'more_policy_ops':
        this.onClickPolicyMoreBtn(moreBtnKey, data);
        break;
      default:
        break;
    }
  }

  onClickListenerMoreBtn(btnKey, data) {
    switch(btnKey) {
      case 'modify':
        createListener(data.childItem, null, true);
        break;
      case 'enable':
        updateListenerState(data.childItem, null, true);
        break;
      case 'disable':
        updateListenerState(data.childItem, null, false);
        break;
      case 'dissoc_pool':
        break;
      case 'delete':
        deleteModal({
          __: __,
          action: 'terminate',
          type: 'listener',
          data: [data.childItem],
          onDelete: function(_data, cb) {
            request.deleteListener(data.childItem).then(() => {
              cb(true);
            });
          }
        });
        break;
      default:
        break;
    }
  }

  onClickPolicyMoreBtn(btnKey, data) {
    switch(btnKey) {
      case 'modify':
        break;
      case 'enable':
        break;
      case 'disable':
        break;
      case 'delete':
        break;
      default:
        break;
    }
  }

  render() {
    return (
      <div className="halo-module-image" style={this.props.style}>
        <Main
          ref="dashboard"
          visible={this.props.style.display === 'none' ? false : true}
          onInitialize={this.onInitialize}
          onAction={this.onAction}
          config={this.state.config}
          params={this.props.params}
          getStatusIcon={getStatusIcon}
          __={__} />
      </div>
    );
  }
}

module.exports = Model;