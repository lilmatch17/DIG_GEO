import { getUniqueId } from '@antv/li-sdk';
import { Button, Form, Input, InputNumber, Space } from 'antd';
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
  const implementDatasetService = appService.getImplementService('GET_ZHONGTAI_API_DATA_LIST');
  const serviceAvailable = !!(implementDatasetService?.metadata?.name);
  const canAddDataset = datasetConfig && datasetConfig.name && datasetConfig.apiUrl;

  const handleSubmit = async () => {
    if (!serviceAvailable || !datasetConfig) return;
    try {
      await form.validateFields();
    } catch { return; }

    const values = form.getFieldsValue();
    const datasetId = getUniqueId();
    const properties = {
      apiUrl: values.apiUrl,
      variableParams: arrayToObject(values.variableParams),
    };

    const dataset = {
      id: datasetId,
      type: 'remote' as const,
      metadata: { name: values.name, refreshInterval: values.refreshInterval || 30 },
      serviceType: implementDatasetService.metadata.name,
      properties,
    };

    onSubmit([dataset]);
  };

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
          <Form.Item name="refreshInterval" label="刷新周期" extra="0=不自动刷新">
            <InputNumber min={0} max={1440} placeholder="30" addonAfter="分钟" style={{ width: 200 }} />
          </Form.Item>
        </Form>
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
