
import React, { PureComponent } from 'react';
import { Layout, Menu, Icon } from 'antd';
import { WidthProvider, Responsive } from "react-grid-layout";
import ReactEcharts from 'echarts-for-react';
import { getBarChart, getLineChart, getPieChart } from "./Chart";
import { MenuItem } from 'rc-menu';
import axios from 'axios';

axios.defaults.baseURL = "http://127.0.0.1:3000/api/dashboard";

const ResponsiveReactGridLayout = WidthProvider(Responsive);
const { Header } = Layout;
const { SubMenu } = Menu;

export default class DragLayout extends PureComponent {
  static defaultProps = {
    breakpoints: { lg: 1000, md: 796, sm: 568, xs: 480, xxs: 0 },
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },//布局中的列数(每个断点的列数)
    rowHeight: 80,
    isDraggable: true,
    isResizable: true,
    margin: [8, 8],
    mounted: false,
    responsive: false,
  };

  constructor(props) {
    super(props);

    this.state = {
      layouts: {},  //拖拽布局
      widgets: [],  //表格布局
      list: [],     //左侧菜单列表
      dashboardDetail: {}, 
      chartsDetail: [],
      chartsData: [],
      isLoadingMore: true, //上滑是否还能加载更多（false时为已加载完全部数据）
      page: 1, //页数，分页加载
      isDone: false, //是否加载完当前一页数据
      now: 0, //左侧菜单列表当前选中项
    }
    this.ref = React.createRef(); //用于放大时能自适应布局
  }

  componentDidMount() {
    // 使用滚动时自动加载更多
    const wrapper = this.refs.wrapper
    let timeoutId
    const callback = () => {
      //获取到按钮离顶部的距离
      const top = wrapper.getBoundingClientRect().top
      const windowHeight = window.screen.height
      if (top && top < windowHeight && this.state.isDone) {
        // 证明 wrapper 已经被滚动到暴露在页面可视范围之内了
        this.loadMoreDataFn();
        this.setState({
          isDone: false
        });
      }
    }
    window.addEventListener('scroll', function () {
      if (!this.state.isLoadingMore) {
        return
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      //如果在50ms以内没有执行scroll 就会执行callBack，如果有下一次滚动，定时器就会被清空
      timeoutId = setTimeout(callback, 50)
    }.bind(this), false);

    this.getList();
    this.getCardData(this.state.page, 1);
  }

  loadMoreDataFn = () => {
    this.getCardData(this.state.page, 1);
    console.log(this.state.page);
  }

  getList() {
    axios.get('/get-my-dashboards',
    ).then((value) => {
      this.setState({
        list: value.data,
      });
    })
      .catch(function (reason) {
        console.log("ppppp1", reason);
      })
  }

  getCardData(page, id) {
    axios.get(`/get-dashboard-detail/${page}`, {
      params: {
        id: id,
      },
    })
      .then((value) => {
        this.setState({
          dashboardDetail: value.data,
        });
        if (value.data.length === 0) {
          this.setState({
            isLoadingMore: false,
          })
        } else {
          for (let i = 0; i < value.data.length; i++) {
            this.getCardChartDetail(value.data[i].id, i, value.data.length);
          }
        }

      })
      .catch(function (reason) {
        console.log("ppppp2", reason);
      })
  }

  getCardChartDetail(id, i, length) {
    axios.get('/get-chart-detail', {
      params: {
        id: id
      }
    })
      .then((value) => {
        this.setState({
          chartsDetail: [...this.state.chartsDetail, ...value.data]
        })
        const addItem = {
          x: this.state.widgets.length % (12 / value.data[0].params.width) * value.data[0].params.width,
          y: Infinity, 
          w: value.data[0].params.width,
          h: value.data[0].params.height,
          i: value.data[0].id + '',
          minH: 2,
          maxH: 6,
          type: value.data[0].type
        };
        this.setState(
          {
            widgets: this.state.widgets.concat({
              ...addItem,
            }),
          },
        );
        axios.get('/get-chart-data', {
          params: {
            id: id
          }
        }).then((value) => {
          this.setState({
            chartsData: [...this.state.chartsData, ...value.data]
          })
          if (length === i + 1) {
            this.setState({
              isDone: true,
              page: this.state.page + 1
            })
          }
          if (length < 6) {
            this.setState({
              isLoadingMore: false,
            })
          }
        })
      })
  }

  generateDOM = () => {
    return this.state.widgets.map((l, i) => {
      let option;
      if (l.type === 'bar') {
        option = getBarChart();
      } else if (l.type === 'line') {
        option = getLineChart();
      } else if (l.type === 'pie') {
        option = getPieChart();
      }
      let component = (
        <ReactEcharts
          option={option}
          notMerge={true}
          lazyUpdate={true}
          style={{ width: '90%', height: '70%', marginLeft: 6, marginRight: 6, }}
        />
      )
      return (
        <div ref={this.ref} key={l.i} data-id={l.i} data-grid={l} style={{ backgroundColor: 'white', fontSize: l.w * l.h * 3 / 5 }}>
          <span className='remove' onClick={this.onRemoveItem.bind(this, i)}>x</span>
          <div style={{ marginTop: 12, marginLeft: 12, fontSize: '1em', fontWeight: 'bold' }}>{this.state.chartsDetail.filter((value, index) => value.id == l.i)[0].title}</div>
          <div style={{ marginTop: 1, marginLeft: 12, fontSize: '0.55em' }}>{this.state.chartsDetail.filter((value, index) => value.id == l.i)[0].time}</div>
          {component}
        </div>
      );
    }
    );
  };

  onRemoveItem(i) {
    console.log(this.state.widgets)
    this.setState({
      widgets: this.state.widgets.filter((item, index) => index != i)
    });
  }
  // 改变某一个项目
  onLayoutChange(layout, layouts) {
    this.setState({ layouts });
  }

  // 使用从此返回的 cols 来计算添加的新项目的位置
  onBreakpointChange = (breakpoint, cols) => {
    // ...
  }

  // 改变 div 大小
  onResizeStop = (a, b, c) => {
    let idname = `.react-grid-layout div[data-id="${c.i}"]`;
    let parentDom = document.querySelector(idname);
    this.ref.current.style.fontSize = c.w * c.h
    console.log("pppppjjjjjj", parentDom.style.fontSize = c.w * c.h * 3 / 5 + 'px');
  }

  clickList = (data) => {
    this.setState({
      now: data.key,
      layouts: {},
      widgets: [],
      dashboardDetail: {},
      chartsDetail: [],
      chartsData: [],
      isLoadingMore: true,
      page: 1,
      isDone: false,
      fontSize: 1
    })
    if (data.key == 0) {
      this.getCardData(this.state.page, Number(data.key) + 1);
    } else {
      this.setState({
        isLoadingMore: false,
      })
    }
  }

  renderHeader = () => {
    return (
      <Header style={{ position: 'fixed', zIndex: 1, width: '100%', backgroundImage: 'linear-gradient(to right, #2B60DC , #4C9BED)', height: 84, flexDirection: 'row' }}>
        <Menu
          theme="dark"
          mode='horizontal'
          defaultSelectedKeys={['chart']}
          style={{ lineHeight: '64px', backgroundColor: 'transparent', color: '#f5f5f5', marginTop: '10px' }}
        >
          <MenuItem key='board'>
            <Icon type="appstore" />
            看板
            </MenuItem>
          <MenuItem key='chart'>
            <Icon type="project" />
            图表
            </MenuItem>
        </Menu>
      </Header>
    );
  }

  renderLeftMenu = () => {
    const list = this.state.list;
    return (
      <div style={{ background: 'white', width: '200px' }}>
        <div style={{ margin: 20, fontSize: 17, color: 'black', fontWeight: 'bold' }}>我的看板</div>
        <Menu
          onClick={this.handleClick}
          style={{ width: 200 }}
          defaultSelectedKeys={['0']}
          defaultOpenKeys={['sub1']}
          mode="inline"
          inlineCollapsed={false}
        >
          <SubMenu
            key="sub1"
            title={
              <div>
                <span>{list[0] ? list[0].category : ''}</span>
              </div>
            }
          >
            {
              list.map((item, index) => {
                return <Menu.Item key={index} onClick={this.clickList}>
                  <Icon type="share-alt" />
                  {item.name}
                </Menu.Item>
              })}
          </SubMenu>
        </Menu>
      </div>
    );
  }

  renderRightDragLayout = () => {
    const list = this.state.list;
    return(
      <div style={{ background: '#f5f5f5', padding: 20, minHeight: 800, flex: 1, justifyContent: 'center' }}>
      <h1>{list[this.state.now] ? list[this.state.now].name : 'null'}</h1>
      <ResponsiveReactGridLayout
        className="layout"
        style={{ marginTop: '10px', marginRight: '10px' }}
        {...this.props}
        layouts={this.state.layouts}
        onLayoutChange={(layout, layouts) =>
          this.onLayoutChange(layout, layouts)
        }
        onResizeStop={this.onResizeStop}
      >
        {this.generateDOM()}
      </ResponsiveReactGridLayout>
      {
        //如果正在加载中就显示加载中。不是就显示加载更多的按钮
        !this.state.isLoadingMore
          ? (
            <div className="loading">
              <span>我是底线-----已全部加载完毕</span>
            </div>
          )
          : (
            // <div className="loadMore" ref="wrapper" onClick={() => this.loadMoreDataFn()}>
            //   <span>加载更多</span>
            // </div>
            <div className="loading" ref="wrapper">
              <Icon type='loading'></Icon>
              <span>加载中……</span>
            </div>
          )
      }
    </div>
    );
  }

  render() {
    //console.log(this.state.chartsData);
    return (
      <Layout>
        {this.renderHeader()}
        <div style={{ marginTop: 84, display: 'flex', flexDirection: 'row' }}>
          {this.renderLeftMenu()}
          {this.renderRightDragLayout()}
        </div>
      </Layout>
    )
  }
}