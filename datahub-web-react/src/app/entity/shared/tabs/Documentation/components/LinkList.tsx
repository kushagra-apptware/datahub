import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components/macro';
import { message, Button, List, Typography, Modal, Form, Input } from 'antd';
import { LinkOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { EntityType, InstitutionalMemoryMetadata } from '../../../../../../types.generated';
import { useEntityData, useMutationUrn } from '../../../EntityContext';
import { useEntityRegistry } from '../../../../../useEntityRegistry';
import { ANTD_GRAY } from '../../../constants';
import { formatDateString } from '../../../containers/profile/utils';
import { useAddLinkMutation, useRemoveLinkMutation } from '../../../../../../graphql/mutations.generated';
import { useUserContext } from '../../../../../context/useUserContext';
import analytics, { EntityActionType, EventType } from '../../../../../analytics';

const LinkListItem = styled(List.Item)`
    border-radius: 5px;
    > .ant-btn {
        opacity: 0;
    }
    &:hover {
        background-color: ${ANTD_GRAY[2]};
        > .ant-btn {
            opacity: 1;
        }
    }
`;

const ListOffsetIcon = styled.span`
    margin-left: -18px;
    margin-right: 6px;
`;

type LinkListProps = {
    refetch?: () => Promise<any>;
};

export const LinkList = ({ refetch }: LinkListProps) => {
    const [editModalVisble, setEditModalVisible] = useState(false);
    const [initialValues, setInitialValues] = useState({
        url: '',
        label: '',
    });
    const [linkDetails, setLinkDetails] = useState<InstitutionalMemoryMetadata | undefined>(undefined);
    const { urn: entityUrn, entityData, entityType } = useEntityData();
    const entityRegistry = useEntityRegistry();
    const [removeLinkMutation] = useRemoveLinkMutation();
    const links = entityData?.institutionalMemory?.elements || [];
    const [form] = Form.useForm();
    const user = useUserContext();
    const [addLinkMutation] = useAddLinkMutation();
    const mutationUrn = useMutationUrn();

    const handleDeleteLink = async (metadata: InstitutionalMemoryMetadata) => {
        try {
            await removeLinkMutation({
                variables: { input: { linkUrl: metadata.url, resourceUrn: metadata.associatedUrn || entityUrn } },
            });
            message.success({ content: 'Link Removed', duration: 2 });
        } catch (e: unknown) {
            message.destroy();
            if (e instanceof Error) {
                message.error({ content: `Error removing link: \n ${e.message || ''}`, duration: 2 });
            }
        }
        refetch?.();
    };

    const handleEditLink = (metadata: InstitutionalMemoryMetadata) => {
        setInitialValues({
            url: metadata.url,
            label: metadata.description,
        });
        setLinkDetails(metadata);
        setEditModalVisible(true);
    };

    const handleClose = () => {
        setEditModalVisible(false);
    };

    const handleEdit = async (formData: any) => {
        if (!linkDetails) return;

        try {
            await removeLinkMutation({
                variables: { input: { linkUrl: linkDetails.url, resourceUrn: linkDetails.associatedUrn || entityUrn } },
            });

            if (user?.urn) {
                await addLinkMutation({
                    variables: { input: { linkUrl: formData.url, label: formData.label, resourceUrn: mutationUrn } },
                });

                message.success({ content: 'Link Updated', duration: 2 });

                analytics.event({
                    type: EventType.EntityActionEvent,
                    entityType,
                    entityUrn: mutationUrn,
                    actionType: EntityActionType.UpdateLinks,
                });

                refetch?.();
                handleClose();
            } else {
                message.error({ content: 'Error updating link: no user', duration: 2 });
            }
        } catch (e: unknown) {
            message.destroy();

            if (e instanceof Error) {
                message.error({ content: `Error updating link: \n ${e.message || ''}`, duration: 2 });
            }
        }
    };

    return entityData ? (
        <>
            <Modal
                title="Edit Link"
                visible={editModalVisble}
                destroyOnClose
                onCancel={handleClose}
                footer={[
                    <Button type="text" onClick={handleClose}>
                        Cancel
                    </Button>,
                    <Button form="editLinkForm" key="submit" htmlType="submit">
                        Edit
                    </Button>,
                ]}
            >
                <Form
                    form={form}
                    name="editLinkForm"
                    onFinish={handleEdit}
                    layout="vertical"
                    initialValues={initialValues}
                >
                    <Form.Item
                        name="url"
                        label="URL"
                        rules={[
                            {
                                required: true,
                                message: 'A URL is required.',
                            },
                            {
                                type: 'url',
                                warningOnly: true,
                                message: 'This field must be a valid url.',
                            },
                        ]}
                    >
                        <Input placeholder="https://" autoFocus />
                    </Form.Item>
                    <Form.Item
                        name="label"
                        label="Label"
                        rules={[
                            {
                                required: true,
                                message: 'A label is required.',
                            },
                        ]}
                    >
                        <Input placeholder="A short label for this link" />
                    </Form.Item>
                </Form>
            </Modal>
            {links.length > 0 && (
                <List
                    size="large"
                    dataSource={links}
                    renderItem={(link) => (
                        <LinkListItem
                            extra={
                                <>
                                    <Button onClick={() => handleEditLink(link)} type="text" shape="circle" danger>
                                        <EditOutlined />
                                    </Button>
                                    <Button onClick={() => handleDeleteLink(link)} type="text" shape="circle" danger>
                                        <DeleteOutlined />
                                    </Button>
                                </>
                            }
                        >
                            <List.Item.Meta
                                title={
                                    <Typography.Title level={5}>
                                        <a href={link.url} target="_blank" rel="noreferrer">
                                            <ListOffsetIcon>
                                                <LinkOutlined />
                                            </ListOffsetIcon>
                                            {link.description || link.label}
                                        </a>
                                    </Typography.Title>
                                }
                                description={
                                    <>
                                        Added {formatDateString(link.created.time)} by{' '}
                                        <Link
                                            to={`${entityRegistry.getEntityUrl(EntityType.CorpUser, link.author.urn)}`}
                                        >
                                            {link.author.username}
                                        </Link>
                                    </>
                                }
                            />
                        </LinkListItem>
                    )}
                />
            )}
        </>
    ) : null;
};
