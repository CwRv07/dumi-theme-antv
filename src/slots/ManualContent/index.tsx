import React, { useEffect, useState } from 'react';
import { Layout, Affix, BackTop, Menu, Tooltip } from 'antd';
import { useMedia } from 'react-use';
import Drawer from 'rc-drawer';
import { useLocale, useSiteData, useFullSidebarData, useRouteMeta } from 'dumi';
import { useNavigate } from "react-router-dom";
import { EditOutlined, MenuFoldOutlined, MenuUnfoldOutlined, VerticalAlignTopOutlined } from '@ant-design/icons';
import readingTime from 'reading-time'

import { getBaseRoute, getIndexRoute, getOpenKeys } from './utils';
import { NavigatorBanner } from './NavigatorBanner';
import ReadingTime from './ReadingTime';
import { TOC } from '../TOC';
import { useScrollToTop } from '../hooks';

import 'rc-drawer/assets/index.css';
import styles from './index.module.less';

export type ManualContent = {
  readonly children: any;
};

type PreAndNext = {
  slug?: string | undefined,
  title?: string | undefined
}

type linkToTitle = {
  [ket:string] :string
}

type MenuItem = {
  key: string,
  label?: string
  slug?: string,
  title: {
    zh: string,
    en: string,
  },
  order: number,
  link?: string,
  children?: MenuItem[]
} 

type FullSidebarData = {
  [key: string]: SidebarData
}

type SidebarData = MenuItem[]

/**
 * 文档的结构
 */
export const ManualContent: React.FC<ManualContent> = ({ children }) => {

  const locale = useLocale()
  const currentLocale: string = locale.id 

  const { themeConfig: { githubUrl, relativePath, docs } } = useSiteData();
  const sidebar = useFullSidebarData() as unknown as FullSidebarData

  const isWide = useMedia('(min-width: 767.99px)', true);
  const [drawOpen, setDrawOpen] = useState(false);
  const navigate = useNavigate();

  // 获取阅读时间
  const mdInfo = useRouteMeta()
  const text = mdInfo.texts.reduce((prev, next) => {
    return prev + next.value
  }, '');
  const { time } = readingTime(text);

  // linkoTitle用来映射路由和Title
  const linkoTitle: linkToTitle = {}
  
  /**
   *  /api/xxx -->  /api
   *  /en/api  -->  /en/api
   */
  const baseRoute = getBaseRoute()
 
  // 获取最终的 MenuData
  const renderSidebar = getMenuData(sidebar, docs, baseRoute, [])
  function getMenuData(funllSidebarData: FullSidebarData, rootList: SidebarData, hrefId: string, list: SidebarData) {
    function fullSidebarDataToMenuData(rootList: SidebarData, hrefId: string, list: SidebarData) {
      // 递归
      rootList.forEach((item: MenuItem) => {
        const href = !baseRoute.startsWith('/en') ? `/${item.slug}` : `/en/${item.slug}`
        const id = href.split("/").slice(0, href.split("/").length - 1).join("/")
        if (href.includes(baseRoute)) {
          if (id === hrefId) {
            list.push({
              ...item,
              key: href,
              label: item.title[currentLocale as 'zh' | 'en']
            })
          }
        }
      })
      for (const item of list) {
        item.children = []
        fullSidebarDataToMenuData(rootList, item.key, item.children)
        funllSidebarData[item.key][0].children?.forEach(itemChild => {
          const label = itemChild.title as unknown as string
          const key = itemChild.link as string
          item.children!.push({
            ...itemChild,
            label,
            key
          })
          linkoTitle[key] = label
        })

        if (item.children.length == 0) {
          delete item.children
        }
      }

      if (hrefId == baseRoute) {
        funllSidebarData[baseRoute] && funllSidebarData[baseRoute][0].children?.forEach(itemChild => {
          const key = itemChild.link!
          const label = itemChild.title as unknown as string
          list.push({
            ...itemChild,
            label,
            key
          })
          linkoTitle[key] = label
        })
        list.sort((a, b) => {
          return a.order - b.order;
        })
        return list;
      }
    }
    return fullSidebarDataToMenuData(rootList, hrefId, list)
  }

  // 获取打开的菜单栏
  const [defaultOpenKeys, setDefaultOpenKeys] = useState<string[]>(() => getOpenKeys())

  // 获取第一个md文件的路由
  const indexRoute = getIndexRoute(renderSidebar)
  
  // 点击菜单栏
  const onClick = (e: any) => {
    navigate(e.key)
    useScrollToTop()
  };
  const [defaultSelectedKey, setDefaultSelectedKey] = useState<[string]>(renderSidebar!.length !== 0 ? [renderSidebar![0].key] : [''])
  //上一夜下一页
  const [prev, setPrev] = useState<PreAndNext | undefined>(undefined)
  const [next, setNext] = useState<PreAndNext | undefined>(undefined)
 
  // 所有的 sidebar 路由
  const sidebarRoutes = []
  for (const route of Object.keys(linkoTitle)) {
    sidebarRoutes.push(route)
  }
  // 兜底 如果 nav 指定有误则自动重定向到 indexDocRoute
  if (window.location.pathname.startsWith('/docs/') || !sidebarRoutes.includes(window.location.pathname)) {
    navigate(indexRoute)
  } 
  // 改变菜单栏选中和 openKeys 状态
  useEffect(() => {    
    if (window.location.pathname == indexRoute) {
      setDefaultOpenKeys(getOpenKeys())
    }
    setDefaultSelectedKey([window.location.pathname])
  }, [window.location.pathname])

  useEffect(() => {
    // 监听选中的menu-item 拿到 prev and next
    getPreAndNext()
  }, [defaultSelectedKey])

  function getPreAndNext() {
    const menuNodes = document.querySelectorAll('aside .ant-menu-item');
    const currentMenuNode = document.querySelector(
      'aside .ant-menu-item-selected',
    );
    // @ts-ignore
    const currentIndex = Array.from(menuNodes).findIndex(
      (node) => node === currentMenuNode,
    );

    const prevNode =
      currentIndex - 1 >= 0 ? menuNodes[currentIndex - 1] : undefined;
    const nextNode =
      currentIndex + 1 < menuNodes.length
        ? menuNodes[currentIndex + 1]
        : undefined;

    setPrev((prevNode
      ? {
        slug: prevNode.getAttribute('link') || undefined,
        title: prevNode.textContent || undefined,
      }
      : undefined))
    setNext((nextNode
      ? {
        slug: nextNode.getAttribute('link') || undefined,
        title: nextNode.textContent || undefined,
      }
      : undefined))
  }
const getGithubSourceUrl = ({
    githubUrl,
    relativePath,
    prefix,
  }: {
    githubUrl: string;
    relativePath: string;
    prefix: string;
  }): string => {
    // https://github.com/antvis/x6/tree/master/packages/x6-sites
    if (githubUrl.includes('/tree/master/')) {
      return `${githubUrl.replace(
        '/tree/master/',
        '/edit/master/',
      )}/${prefix}/${relativePath}`;
    }
    return `${githubUrl}/edit/master/${prefix}/${relativePath}`;
  };
  const menu = (
    <Menu
      onClick={onClick}
      onOpenChange={(openKeys) => {
        setDefaultOpenKeys(openKeys);
      }}
      selectedKeys={defaultSelectedKey}
      openKeys={defaultOpenKeys}
      mode="inline"
      items={renderSidebar}
      inlineIndent={16}
      style={{ height: '100%' }}
      forceSubMenuRender
      triggerSubMenuAction='click'
    />
  );
  return (
    <>
      <Layout
        style={{ background: '#fff' }}
        hasSider
        className={styles.layout}>
        <Affix
          offsetTop={0}
          className={styles.affix}
          style={{ height: isWide ? '100vh' : 'inherit' }}
        >
          {isWide ? (
            <Layout.Sider width="auto" theme="light" className={styles.sider}>
              {menu}
            </Layout.Sider>
          ) : (
            <Drawer
              handler={
                drawOpen ? (
                  <MenuFoldOutlined className={styles.menuSwitch} />
                ) : (
                  <MenuUnfoldOutlined className={styles.menuSwitch} />
                )
              }
              wrapperClassName={styles.menuDrawer}
              onChange={(open?: boolean) => setDrawOpen(!!open)}
              width={280}
            >
              {menu}
            </Drawer>
          )}

        </Affix>
        <Layout.Content className={styles.content}>
          <div className={styles.contentMain}>
            <h1>
              {linkoTitle[window.location.pathname]}
              <Tooltip title={'在 GitHub 上编辑'}>
                <a
                  href={getGithubSourceUrl({
                    githubUrl,
                    relativePath,
                    prefix: 'docs',
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.editOnGtiHubButton}
                >
                  <EditOutlined />
                </a>
              </Tooltip>
            </h1>
            <ReadingTime readingTime={time} className={styles.readtime}></ReadingTime>
            <div className={styles.markdown}>
              {children}
            </div>
            <div>
              <div className={styles.preandnext}>
                <NavigatorBanner type="prev" post={prev} />
                <NavigatorBanner type="next" post={next} />
                <BackTop style={{ right: 32 }}>
                  <div className={styles.backTop}>
                    <VerticalAlignTopOutlined />
                  </div>
                </BackTop>
              </div>
            </div>
          </div>
        </Layout.Content>
        { /** @toc-width: 260px; */}
        <Layout.Sider theme="light" width={260} >
          <Affix
            className={styles.toc}
          >
            <TOC />
          </Affix>
        </Layout.Sider>
      </Layout>
    </>
  );
};