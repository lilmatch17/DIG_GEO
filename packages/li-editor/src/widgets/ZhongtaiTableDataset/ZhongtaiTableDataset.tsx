import { getUniqueId } from '@antv/li-sdk';
import { Button, Form, Input, message, Select, Space, Table, Typography } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { useEditorService } from '../../hooks';
import type { ImplementEditorAddDatasetWidgetProps } from '../../types';

type Props = ImplementEditorAddDatasetWidgetProps;

interface ResourceItem {
  resourceId: string;
  resourceName: string;
  resourceCode: string;
  resourceType: string;
  datasourceId: string;
  datasourceName: string;
  datasourceCode: string;
  typeCode: string;
  tableName?: string;
  catalog?: string;
  storageLayer?: string;
  storageLayerName?: string;
  resourceDesp?: string;
  columnsTotal?: number;
  lastUpdateTime?: string;
}

export default function ZhongtaiTableDataset(props: Props) {
  const { onSubmit, onCancel } = props;
  const { appService } = useEditorService();
  const [form] = Form.useForm();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [previewColumns, setPreviewColumns] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const implementDatasetService = appService.getImplementService('GET_ZHONGTAI_TABLE_DATA_LIST');
  const serviceAvailable = !!implementDatasetService?.metadata?.name;
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);

  useEffect(() => {
    setLoadingResources(true);
    fetch('/api/zhongtai/resources/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scopeType: 'Space' }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(data.error || `请求失败 (HTTP ${r.status})`);
        }
        return data;
      })
      .then((data) => {
        const list: ResourceItem[] = data.resources || [];
        const tables = list.filter((r: ResourceItem) => r.resourceType === 'table' || !r.resourceType);
        setResources(tables);
        if (tables.length === 0) {
          message.warning('中台未返回任何数据表，请确认账号权限或空间配置');
        }
      })
      .catch((err) => {
        message.error('获取数据资源列表失败: ' + (err.message || '网络错误'));
        setResources([]);
      })
      .finally(() => setLoadingResources(false));
  }, []);

  const handleResourceChange = useCallback(
    (resourceId: string) => {
      const resource = resources.find((r) => r.resourceId === resourceId);
      setSelectedResource(resource || null);
      setPreviewData(null);
      setPreviewColumns([]);
      setRowCount(0);
      if (resource) {
        form.setFieldsValue({ resourceName: resource.resourceName });
      }
    },
    [resources, form],
  );

  const handlePreview = useCallback(async () => {
    const values = form.getFieldsValue();
    if (!values.resourceId) {
      message.warning('请先选择数据资源');
      return;
    }
    const resource = resources.find((r) => r.resourceId === values.resourceId);
    if (!resource) {
      message.warning('未找到选中的数据资源');
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/zhongtai/resources/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasourceId: resource.datasourceId,
          resourceName: resource.tableName || resource.resourceName,
          limit: 20,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        message.error(errData.error || '预览失败');
        return;
      }
      const data = await res.json();
      setPreviewData(data.rows || []);
      setPreviewColumns(data.columns || []);
      setRowCount(data.rowCount || 0);
      if ((data.rows || []).length > 0) {
        message.success('预览成功，共 ' + (data.rowCount || 0).toLocaleString() + ' 行（显示前20行）');
      } else {
        message.info('返回数据为空');
      }
    } catch (err: any) {
      message.error('预览请求失败: ' + (err.message || '网络错误'));
    } finally {
      setPreviewLoading(false);
    }
  }, [form, resources]);

  const handleSubmit = useCallback(async () => {
    if (!serviceAvailable) {
      message.error('数据集服务未注册，无法创建。请刷新页面后重试。');
      return;
    }
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const values = form.getFieldsValue();
    const resource = resources.find((r) => r.resourceId === values.resourceId);
    if (!resource) {
      message.error('未找到选中的数据资源');
      return;
    }
    setSubmitting(true);
    try {
      const datasetId = getUniqueId();
      const columns = previewColumns.map((col: any) => ({
        name: col.name,
        type: col.type || 'string',
        displayName: col.comment || '',
      }));
      const dataset = {
        id: datasetId,
        type: 'remote' as const,
        metadata: { name: values.name || resource.resourceName, refreshInterval: 0 },
        serviceType: implementDatasetService.metadata.name,
        properties: {
          datasourceId: resource.datasourceId,
          resourceName: resource.tableName || resource.resourceName,
          resourceId: resource.resourceId,
        },
        columns,
      };
      onSubmit([dataset]);
    } finally {
      setSubmitting(false);
    }
  }, [implementDatasetService, form, resources, previewColumns, onSubmit]);

  const canSubmit = !!(form.getFieldValue('name') && form.getFieldValue('resourceId'));
  const previewTableColumns =
    previewData && previewData.length > 0
      ? Object.keys(previewData[0]).map((key) => ({ title: key, dataIndex: key, key, ellipsis: true }))
      : [];

  return (
    <>
      <div style={{ width: 800 }}>
        <Form form={form} labelCol={{ span: 4 }}>
          <Form.Item name="name" label="数据集名称" rules={[{ required: true }]}>
            <Input placeholder="请输入数据集名称" />
          </Form.Item>
          <Form.Item name="resourceId" label="数据资源" rules={[{ required: true }]}>
            <Select
              placeholder="请选择中台数据资源"
              loading={loadingResources}
              showSearch
              filterOption={(input, option) =>
                ((option?.label as string) || '').toLowerCase().includes(input.toLowerCase())
              }
              options={resources.map((r) => ({
                value: r.resourceId,
                label: r.resourceName + ' (' + r.datasourceName + ')' + (r.resourceDesp ? ' - ' + r.resourceDesp : ''),
              }))}
              onChange={handleResourceChange}
            />
          </Form.Item>
          {selectedResource && (
            <div style={{ marginBottom: 16, marginLeft: '17%', color: '#888', fontSize: 12 }}>
              <Typography.Text type="secondary">
                数据源: {selectedResource.datasourceName} ({selectedResource.typeCode})
                {selectedResource.storageLayerName && ' | 分层: ' + selectedResource.storageLayerName}
                {selectedResource.columnsTotal != null && ' | ' + selectedResource.columnsTotal + ' 列'}
                {selectedResource.lastUpdateTime && ' | 更新: ' + selectedResource.lastUpdateTime}
              </Typography.Text>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <Button onClick={handlePreview} loading={previewLoading} type="default">
              预览数据
            </Button>
            {rowCount > 0 && (
              <span style={{ marginLeft: 12, color: '#52c41a' }}>共 {rowCount.toLocaleString()} 行</span>
            )}
          </div>
        </Form>
        {previewData && previewData.length > 0 && (
          <Table
            columns={previewTableColumns}
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
          <Button disabled={!canSubmit} type="primary" onClick={handleSubmit} loading={submitting}>
            添加
          </Button>
        </Space>
      </div>
    </>
  );
}
