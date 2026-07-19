import { useTitle } from 'ahooks';
import { Layout, theme } from 'antd';
import { Content, Header } from 'antd/lib/layout/layout';
import { Outlet } from 'umi';
import styles from './WorkSpace.less';
import { useInternalUserPrompt } from '@/hooks';

const { useToken } = theme;

export default function WorkSpaceLayout() {
  const internalUserPrompt = useInternalUserPrompt();
  const { token } = useToken();
  useTitle('地理可视化');

  return (
    <Layout className={styles.layout}>
      <Content style={{ color: token.colorText, padding: '24px' }}>
        {internalUserPrompt}
        <Outlet />
      </Content>
    </Layout>
  );
}
