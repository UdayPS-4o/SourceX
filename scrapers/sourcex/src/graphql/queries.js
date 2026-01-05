/**
 * GraphQL Queries
 * All GraphQL queries and mutations used by the client
 */

const LOGIN_MUTATION = `mutation Login($email: String!, $password: String!) {
    obtainToken(input: {email: $email, password: $password}) {
        message
        refreshToken
        success
        token
        permissions
        groups
        user {
            country
            dateJoined
            email
            fcmToken
            firstName
            id
            isActive
            isReseller
            isStaff
            lastName
            phone
            points
            referCode
            savedAddresses {
                edges {
                    node {
                        address
                        city
                        createdAt
                        email
                        id
                        isDefault
                        label
                        name
                        phone
                        pincode
                        state
                        updatedAt
                    }
                }
                totalCount
            }
            reseller {
                address
                alternatePhone
                buyerName
                city
                coverImage
                fcmToken
                fulfillmentPercentage
                id
                isBuyer
                totalRejectedOrders
                storeUrl
                storeName
                state
                shippedOrders
                profilePhoto
                points
                pincode
                pickupAddresses
                membershipType
                membershipStartDate
                membershipExpiryDate
                level
                isVerified
            }
        }
    }
}`;

const REFRESH_TOKEN_MUTATION = `mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
        payload
        refreshExpiresIn
        token
    }
}`;

const MY_INVENTORY_QUERY = `query MyInventory($after: String, $first: Int!, $filters: InventoryFilter) {
    myInventories(
        after: $after
        first: $first
        order: {createdAt: DESC}
        filters: $filters
    ) {
        pageInfo {
            endCursor
            hasNextPage
            hasPreviousPage
            startCursor
        }
        edges {
            cursor
            node {
                availability
                boxCondition
                createdAt
                id
                isActive
                isConsigned
                isListed
                isSold
                notes
                pairLocation
                purchaseDate
                purchasePlace
                purchasePrice
                updatedAt
                quantity
                sxOrders {
                    edges {
                        node {
                            id
                        }
                    }
                }
                variant {
                    createdAt
                    id
                    lowestPrice
                    title
                    updatedAt
                    product {
                        brandName
                        category
                        createdAt
                        description
                        id
                        isActive
                        lowestPrice
                        isD2c
                        priorityOrder
                        skuId
                        slug
                        subCategory
                        tags
                        title
                        updatedAt
                        images {
                            edges {
                                node {
                                    image
                                }
                            }
                        }
                    }
                }
                platformListings {
                    edges {
                        node {
                            createdAt
                            id
                            isActive
                            isApproved
                            marketplace {
                                commissionPercentage
                                title
                                shippingCharges
                                miscellaneousCharges
                            }
                            resellerPayoutPrice
                        }
                    }
                }
            }
        }
        totalCount
    }
}`;

const LOWEST_NOT_LOWEST_QUERY = `query LowestAndNotLowest($isLowest: Boolean = true, $order: InventoryOrder = {}, $first: Int = 100, $after: String = "") {
    lowestNotLowest(
        isLowest: $isLowest
        order: $order
        first: $first
        after: $after
        filters: {isConsigned: {exact: false}}
    ) {
        pageInfo {
            endCursor
            hasNextPage
            hasPreviousPage
            startCursor
        }
        totalCount
        edges {
            node {
                availability
                boxCondition
                createdAt
                id
                isActive
                isConsigned
                isSold
                isListed
                notes
                pairLocation
                purchaseDate
                purchasePlace
                purchasePrice
                quantity
                sxOrders {
                    edges {
                        node {
                            id
                        }
                    }
                }
                variant {
                    createdAt
                    id
                    lowestPrice
                    title
                    updatedAt
                    product {
                        brandName
                        category
                        createdAt
                        description
                        id
                        isD2c
                        isActive
                        lowestPrice
                        priorityOrder
                        skuId
                        slug
                        subCategory
                        tags
                        title
                        updatedAt
                        images {
                            edges {
                                node {
                                    image
                                }
                            }
                        }
                    }
                }
                platformListings {
                    edges {
                        node {
                            id
                            createdAt
                            isActive
                            resellerPayoutPrice
                            resellerPayoutPriceSx
                            updatedAt
                            isApproved
                            marketplace {
                                additionalDetails
                                address
                                city
                                commissionPercentage
                                country
                                marketplaceUrl
                                id
                                miscellaneousCharges
                                shippingCharges
                                phone
                                title
                            }
                            platform
                            marketplaceListingId
                            trackingId
                            status
                            trackingLink
                            trackingProvider
                        }
                    }
                }
            }
        }
    }
}`;

const UPDATE_PLATFORM_LISTINGS_MUTATION = `mutation MyMutation($updates: [PlatformListingUpdateInput!]!) {
    updateMultiplePlatformListings(updates: $updates) {
        containerLocation
        createdAt
        id
        isOnline
        isActive
        marketplaceListingId
        platform
        resellerPayoutPriceSx
        resellerPayoutPrice
        status
        trackingId
        trackingLink
        trackingProvider
        updatedAt
        marketplace {
            additionalDetails
            city
            address
            commissionPercentage
            country
            id
            marketplaceUrl
            phone
            miscellaneousCharges
            shippingCharges
            title
        }
    }
}`;

const GET_INVENTORY_DETAILS_QUERY = `query GetInventoryDetails($id: ID!) {
    node(id: $id) {
        ... on MyInventoryType {
            id
            platformListings {
                edges {
                    node {
                        id
                        resellerPayoutPrice
                        isActive
                    }
                }
            }
        }
    }
}`;

module.exports = {
    LOGIN_MUTATION,
    REFRESH_TOKEN_MUTATION,
    MY_INVENTORY_QUERY,
    LOWEST_NOT_LOWEST_QUERY,
    UPDATE_PLATFORM_LISTINGS_MUTATION,
    GET_INVENTORY_DETAILS_QUERY
};
