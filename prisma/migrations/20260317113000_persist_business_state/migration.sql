ALTER TABLE `Export`
    ADD COLUMN `destinationCountry` VARCHAR(191) NULL,
    ADD COLUMN `destinationPort` VARCHAR(191) NULL,
    ADD COLUMN `price` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'To-do',
    ADD COLUMN `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    ADD COLUMN `invoiceNumber` VARCHAR(191) NULL;

ALTER TABLE `LocalSale`
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'To-do',
    ADD COLUMN `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    ADD COLUMN `invoiceNumber` VARCHAR(191) NULL;

ALTER TABLE `CoconutPurchase`
    ADD COLUMN `clientId` VARCHAR(191) NULL,
    ADD COLUMN `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'Pending';

CREATE TABLE `CoconutWorkerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `weekStart` DATETIME(3) NOT NULL,
    `processedCoconuts` INTEGER NOT NULL,
    `totalWorkerCost` DOUBLE NOT NULL,
    `paidToWorker` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
