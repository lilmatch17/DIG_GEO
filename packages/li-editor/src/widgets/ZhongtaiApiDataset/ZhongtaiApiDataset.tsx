import { getUniqueId } from '@antv/li-sdk';
import { Button, Form, Input, Space, Table, message } from 'antd';
import React, { useState } from 'react';
import classNames from 'classnames';
import { useEditorService, usePrefixCls } from '../../hooks';
import type { ImplementEditorAddDatasetWidgetProps } from '../../types';
import DynamicFormItem from '../FetchDataset/DynamicFormItem';

type Props = ImplementEditorAddDatasetWidgetProps;

export default function ZhongtaiApiDataset(props: Props) {
  const { onSubmit, onCancel } = props;
  const prefixCls = usePrefixCls('zhongtai-api-dataset');
  const { appService } = useEditorService();
  const [datasetConfig, setDatasetConfig] = useState<any>();
  const [form] = Form.useForm();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const implementDatasetService = appService.getImplementService('GET_ZHONGTAI_API_DATA_LIST');
  const serviceAvailable = !!(implementDatasetService?.metadata?.name);
  const canAddDataset = datasetConfig && datasetConfig.name && datasetConfig.apiUrl;

  const handleSubmit = async () => {
    if (!serviceAvailable || !datasetConfig) return;
    try { await form.validateFields(); } catch { return; }

    const values = form.getFieldsValue();
    const datasetId = getUniqueId();
    const properties = {
      apiUrl: values.apiUrl,
      variableParams: arrayToObject(values.variableParams),
    };

    const dataset = {
      id: datasetId,
      type: 'remote' as const,
      metadata: { name: values.name, refreshInterval: 0 },
      serviceType: implementDatasetService.metadata.name,
      properties,
    };

    onSubmit([dataset]);
  };

  const handlePreview = async () => {
    const values = form.getFieldsValue();
    if (!values.apiUrl) { message.warning('请先填写API地址'); return; }
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const resp = await fetch('/api/datasource/zhongtai/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: values.apiUrl,
          variableParams: arrayToObject(values.variableParams),
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        message.error(err.error || '请求失败');
        return;
      }
      const result = await resp.json();
      let rows = result.rows || (Array.isArray(result) ? result : []);
      if (rows.length > 0) {
        setPreviewData(rows.slice(0, 20));
        message.success(`获取成功，共 ${rows.length} 条（预览前20条）`);
      } else {
        message.info('返回数据为空');
      }
    } catch (e: any) {
      message.error('请求失败: ' + (e.message || '网络错误'));
    } finally { setPreviewLoading(false); }
  };

  const columns = previewData && previewData.length > 0
    ? Object.keys(previewData[0]).map(key => ({ title: key, dataIndex: key, key, ellipsis: true }))
    : [];

  return (
    <>
      <div className={classNames(prefixCls)} style={{ width: 800 }}>
        <Form requiredMark={false} form={form} onValuesChange={(_, all) => setDatasetConfig(all)} labelCol={{ span: 3 }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请填写数据集名称' }]}>
            <Input placeholder="请输入数据集名称" />
          </Form.Item>
          <Form.Item name="apiUrl" label="API地址" rules={[{ required: true, message: '请输入API地址' }]}>
            <Input placeholder="http://10.16.1.6:8081/daasDMS/ssoapi/ApiDataResource/test_1017001" />
          </Form.Item>
          <Form.Item label="输入参数" name="variableParams">
            <DynamicFormItem fieldName="variableParams" />
          </Form.Item>
        </Form>
        <div style={{ marginBottom: 16, marginTop: -8 }}>
          <Button onClick={handlePreview} loading={previewLoading} type="default">
            预览数据
          </Button>
        </div>
        {previewData && previewData.length > 0 && (
          <Table
            columns={columns}
            dataSource={previewData}
            rowKey={(_, i) => String(i)}
            size="small"
            scroll={{ x: true, y: 200 }}
            pagination={false}
            style={{ marginBottom: 16 }}
          />
        )}
      </div>
      <div className="li-fetch-dataset__footer ant-modal-footer">
        <Space>
          <Button onClick={onCancel}>返回</Button>
          <Button disabled={!canAddDataset} type="primary" onClick={handleSubmit}>添加</Button>
        </Space>
      </div>
    </>
  );
}

function arrayToObject(arr?: { field: string; value: any }[]): Record<string, any> {
  if (!arr || !arr.length) return {};
  const obj: Record<string, any> = {};
  for (const item of arr) {
    if (item.field) obj[item.field] = item.value;
  }
  return obj;
}
