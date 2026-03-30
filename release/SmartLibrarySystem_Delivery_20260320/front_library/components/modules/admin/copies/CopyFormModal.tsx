import React, { useEffect, useState } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Select,
    SelectItem,
    Textarea,
} from "@heroui/react";
import { toast } from "sonner";

import { BookCopy, BookCopyCreateRequest, BookCopyUpdateRequest, CopyStatus } from "@/services/api/bookCopyService";

const statusOptions: { key: CopyStatus; label: string }[] = [
    { key: "AVAILABLE", label: "可借" },
    { key: "BORROWED", label: "已借出" },
    { key: "RESERVED", label: "已预约" },
    { key: "LOST", label: "遗失" },
    { key: "DAMAGED", label: "损坏" },
];

interface CopyFormModalProps {
    isOpen: boolean;
    onOpenChange: () => void;
    onSubmit: (data: BookCopyCreateRequest | BookCopyUpdateRequest) => Promise<void>;
    initialData?: BookCopy | null;
    initialBookId?: number;
    isLoading: boolean;
}

export const CopyFormModal = ({
    isOpen,
    onOpenChange,
    onSubmit,
    initialData,
    initialBookId,
    isLoading,
}: CopyFormModalProps) => {
    const isEdit = !!initialData;

    const [bookId, setBookId] = useState("");
    const [status, setStatus] = useState<CopyStatus>("AVAILABLE");
    const [acquisitionDate, setAcquisitionDate] = useState("");
    const [price, setPrice] = useState("");
    const [notes, setNotes] = useState("");
    const [locationCode, setLocationCode] = useState("");
    const [rfidTag, setRfidTag] = useState("");
    const [floorPlanId, setFloorPlanId] = useState("");

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setBookId(String(initialData.bookId));
                setStatus(initialData.status);
                setAcquisitionDate(initialData.acquisitionDate?.slice(0, 10) ?? "");
                setPrice(String(initialData.price ?? ""));
                setNotes(initialData.notes ?? "");
                setLocationCode(initialData.locationCode ?? "");
                setRfidTag(initialData.rfidTag ?? "");
                setFloorPlanId(initialData.floorPlanId != null ? String(initialData.floorPlanId) : "");
            } else {
                setBookId(initialBookId != null ? String(initialBookId) : "");
                setStatus("AVAILABLE");
                setAcquisitionDate(new Date().toISOString().slice(0, 10));
                setPrice("");
                setNotes("");
                setLocationCode("");
                setRfidTag("");
                setFloorPlanId("");
            }
        }
    }, [isOpen, initialData, initialBookId]);

    const handleSubmit = () => {
        if (!isEdit && !bookId) {
            toast.warning("请输入图书 ID");

            return;
        }
        if (isEdit) {
            const payload: BookCopyUpdateRequest = {
                status,
                acquisitionDate: acquisitionDate || undefined,
                price: price ? parseFloat(price) : undefined,
                notes: notes || undefined,
                locationCode: locationCode || undefined,
                rfidTag: rfidTag || undefined,
                floorPlanId: floorPlanId ? Number(floorPlanId) : undefined,
            };

            onSubmit(payload);
        } else {
            const payload: BookCopyCreateRequest = {
                bookId: parseInt(bookId),
                status,
                acquisitionDate: acquisitionDate || undefined,
                price: price ? parseFloat(price) : undefined,
                notes: notes || undefined,
                locationCode: locationCode || undefined,
                rfidTag: rfidTag || undefined,
                floorPlanId: floorPlanId ? Number(floorPlanId) : undefined,
            };

            onSubmit(payload);
        }
    };

    return (
        <Modal
            backdrop="blur"
            isOpen={isOpen}
            placement="center"
            size="lg"
            onOpenChange={onOpenChange}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader>{isEdit ? "编辑副本" : "新增副本"}</ModalHeader>
                        <ModalBody>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {!isEdit && (
                                    <Input
                                        isRequired
                                        label="图书 ID"
                                        type="number"
                                        placeholder="输入所属图书的 ID"
                                        value={bookId}
                                        variant="bordered"
                                        onValueChange={setBookId}
                                    />
                                )}
                                {isEdit && (
                                    <Input
                                        isReadOnly
                                        label="所属图书"
                                        value={`#${initialData?.bookId} - ${initialData?.bookTitle}`}
                                        variant="bordered"
                                    />
                                )}
                                <Select
                                    label="状态"
                                    selectedKeys={[status]}
                                    variant="bordered"
                                    onSelectionChange={(keys) => {
                                        const val = Array.from(keys)[0] as CopyStatus;

                                        if (val) setStatus(val);
                                    }}
                                >
                                    {statusOptions.map((o) => (
                                        <SelectItem key={o.key}>{o.label}</SelectItem>
                                    ))}
                                </Select>
                                <Input
                                    label="购入日期"
                                    type="date"
                                    value={acquisitionDate}
                                    variant="bordered"
                                    onValueChange={setAcquisitionDate}
                                />
                                <Input
                                    label="馆藏位置"
                                    placeholder="如 A-3-12"
                                    value={locationCode}
                                    variant="bordered"
                                    onValueChange={setLocationCode}
                                />
                                <Input
                                    label="RFID 标签"
                                    placeholder="可选，填写唯一标签"
                                    value={rfidTag}
                                    variant="bordered"
                                    onValueChange={setRfidTag}
                                />
                                <Input
                                    label="楼层平面图 ID"
                                    type="number"
                                    placeholder="可选"
                                    value={floorPlanId}
                                    variant="bordered"
                                    onValueChange={setFloorPlanId}
                                />
                                <Input
                                    label="价格"
                                    type="number"
                                    placeholder="0.00"
                                    value={price}
                                    variant="bordered"
                                    startContent={<span className="text-default-400 text-sm">¥</span>}
                                    onValueChange={setPrice}
                                />
                                <Textarea
                                    className="md:col-span-2"
                                    label="备注"
                                    placeholder="可选备注信息"
                                    value={notes}
                                    variant="bordered"
                                    onValueChange={setNotes}
                                />
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="danger" variant="flat" onPress={onClose}>
                                取消
                            </Button>
                            <Button color="primary" isLoading={isLoading} onPress={handleSubmit}>
                                {isEdit ? "保存修改" : "确认新增"}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};
