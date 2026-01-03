fetch("https://api.culture-circle.com/graphql", {
  "headers": {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "",
    "cache-control": "no-cache",
    "content-type": "application/json",
    "pragma": "no-cache",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Brave\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "sec-gpc": "1",
    "Referer": "https://sourcex.app/"
  },
  "body": "{\"operationName\":\"Login\",\"variables\":{\"email\":\"arsalana501@gmail.com\",\"password\":\"Ahmed@786\"},\"query\":\"mutation Login($email: String!, $password: String!) {\\n  obtainToken(input: {email: $email, password: $password}) {\\n    message\\n    refreshToken\\n    success\\n    token\\n    permissions\\n    groups\\n    user {\\n      country\\n      dateJoined\\n      email\\n      fcmToken\\n      firstName\\n      id\\n      isActive\\n      isReseller\\n      isStaff\\n      lastName\\n      phone\\n      points\\n      referCode\\n      savedAddresses {\\n        edges {\\n          node {\\n            address\\n            city\\n            createdAt\\n            email\\n            id\\n            isDefault\\n            label\\n            name\\n            phone\\n            pincode\\n            state\\n            updatedAt\\n            __typename\\n          }\\n          __typename\\n        }\\n        totalCount\\n        __typename\\n      }\\n      reseller {\\n        address\\n        alternatePhone\\n        buyerName\\n        city\\n        coverImage\\n        fcmToken\\n        fulfillmentPercentage\\n        id\\n        isBuyer\\n        totalRejectedOrders\\n        storeUrl\\n        storeName\\n        state\\n        shippedOrders\\n        profilePhoto\\n        points\\n        pincode\\n        pickupAddresses\\n        membershipType\\n        membershipStartDate\\n        membershipExpiryDate\\n        level\\n        isVerified\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\"}",
  "method": "POST"
});

-> res->
{
    "data": {
        "obtainToken": {
            "message": "Authentication successful",
            "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc3NTIyMTY4MywiaWF0IjoxNzY3NDQ1NjgzLCJqdGkiOiJiMTNhNjU1MTAxZGM0NTE5OWUzYzE0MGY1ZTM5NzEwMyIsInVzZXJfaWQiOjE3MzQxM30.FJO9Wz4j1ew853_aMT2KtzQ5kJ-8daPb-Fblr3Uua3M",
            "success": true,
            "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY3NDQ5MjgzLCJpYXQiOjE3Njc0NDU2ODMsImp0aSI6IjhjNWI0YTQ5MDQzODQxYzU4NmFhMDgzMDJiOGRkODVjIiwidXNlcl9pZCI6MTczNDEzfQ.Z3fQT2IvFOVGcx6DB0-p14jNBVUDrUPJXmRn-a8DXXo",
            "permissions": [],
            "groups": [],
            "user": {
                "country": "India",
                "dateJoined": "2023-11-07T13:04:56.490972+00:00",
                "email": "arsalana501@gmail.com",
                "fcmToken": "eCl3NBJMC0ADjGueuAmg3H:APA91bGit_4sM8XzIlP4yvZq8CsX0pG8CePZKvsdWK_QKMQkd1QCFewZHQ8k3oROMNA6P2R9VE-RzQ3mIPWJwYDo4UwEvDXxqLL-sRiY80jCy9mAcTde1MCAgUPjyF0lGKK66ByKBZyO",
                "firstName": "Arsalan",
                "id": "VXNlclR5cGU6MTczNDEz",
                "isActive": true,
                "isReseller": true,
                "isStaff": false,
                "lastName": "Ahmed",
                "phone": "+919481979781",
                "points": 41800,
                "referCode": "",
                "savedAddresses": {
                    "edges": [
                        {
                            "node": {
                                "address": "M53, m block market greater kailash - 2",
                                "city": "delhi",
                                "createdAt": "2025-11-20T08:44:56.024949+00:00",
                                "email": "arsalana501@gmail.com",
                                "id": "U2F2ZWRBZGRyZXNzVHlwZToxOTg=",
                                "isDefault": true,
                                "label": "work",
                                "name": "arsalan ahmed",
                                "phone": "8882918867",
                                "pincode": 110048,
                                "state": "delhi",
                                "updatedAt": "2025-11-20T08:44:56.024962+00:00",
                                "__typename": "SavedAddressType"
                            },
                            "__typename": "SavedAddressTypeEdge"
                        },
                        {
                            "node": {
                                "address": "A 305, new raj apartment, saint mirabai road, gartanpada no 2,dahisar",
                                "city": "Mumbai",
                                "createdAt": "2025-12-26T06:32:20.403815+00:00",
                                "email": "arsalana501@gmail.com",
                                "id": "U2F2ZWRBZGRyZXNzVHlwZToxNjM5MA==",
                                "isDefault": false,
                                "label": "home",
                                "name": "dhruv mehta",
                                "phone": "9372196218",
                                "pincode": 400064,
                                "state": "Maharashtra",
                                "updatedAt": "2025-12-26T06:32:20.403831+00:00",
                                "__typename": "SavedAddressType"
                            },
                            "__typename": "SavedAddressTypeEdge"
                        },
                        {
                            "node": {
                                "address": "1404, indigo, hm world city apartments, jp nagar 9th phase",
                                "city": "bengaluru",
                                "createdAt": "2025-12-17T12:46:43.534726+00:00",
                                "email": "arsalana501@gmail.com",
                                "id": "U2F2ZWRBZGRyZXNzVHlwZToxMjM5MA==",
                                "isDefault": false,
                                "label": "speedcat",
                                "name": "Arsalan",
                                "phone": "8123443883",
                                "pincode": 560062,
                                "state": "Karnataka",
                                "updatedAt": "2025-12-17T12:46:43.534739+00:00",
                                "__typename": "SavedAddressType"
                            },
                            "__typename": "SavedAddressTypeEdge"
                        }
                    ],
                    "totalCount": 3,
                    "__typename": "SavedAddressTypeConnection"
                },
                "reseller": {
                    "address": "224, Urooj Residency, BDA Layout, Avalahalli",
                    "alternatePhone": "+918123443883",
                    "buyerName": "",
                    "city": "Bangalore Urban",
                    "coverImage": "http://via.placeholder.com/1280x720",
                    "fcmToken": "eCl3NBJMC0ADjGueuAmg3H:APA91bGit_4sM8XzIlP4yvZq8CsX0pG8CePZKvsdWK_QKMQkd1QCFewZHQ8k3oROMNA6P2R9VE-RzQ3mIPWJwYDo4UwEvDXxqLL-sRiY80jCy9mAcTde1MCAgUPjyF0lGKK66ByKBZyO",
                    "fulfillmentPercentage": 89.92,
                    "id": "UmVzZWxsZXJUeXBlOjU1OA==",
                    "isBuyer": false,
                    "totalRejectedOrders": 108,
                    "storeUrl": "crepsgate",
                    "storeName": "Crepsgate",
                    "state": "Karnataka",
                    "shippedOrders": 792,
                    "profilePhoto": "",
                    "points": 1065800,
                    "pincode": "560062",
                    "pickupAddresses": [],
                    "membershipType": "Free",
                    "membershipStartDate": "2023-11-07",
                    "membershipExpiryDate": "2024-02-05",
                    "level": 334,
                    "isVerified": true,
                    "__typename": "ResellerType"
                },
                "__typename": "UserType"
            },
            "__typename": "ObtainTokenResponse"
        }
    }
}

______________________________


______________________________


fetch("https://api.culture-circle.com/graphql", {
  "headers": {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY3NDQ5MjgzLCJpYXQiOjE3Njc0NDU2ODMsImp0aSI6IjhjNWI0YTQ5MDQzODQxYzU4NmFhMDgzMDJiOGRkODVjIiwidXNlcl9pZCI6MTczNDEzfQ.Z3fQT2IvFOVGcx6DB0-p14jNBVUDrUPJXmRn-a8DXXo",
    "cache-control": "no-cache",
    "content-type": "application/json",
    "pragma": "no-cache",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Brave\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "sec-gpc": "1",
    "Referer": "https://sourcex.app/"
  },
  "body": "{\"operationName\":\"MyInventory\",\"variables\":{\"after\":\"\",\"first\":100,\"filters\":{\"isSold\":{},\"isListed\":{},\"isConsigned\":{\"exact\":false}}},\"query\":\"query MyInventory($after: String, $first: Int!, $filters: InventoryFilter) {\\n  myInventories(\\n    after: $after\\n    first: $first\\n    order: {createdAt: DESC}\\n    filters: $filters\\n  ) {\\n    pageInfo {\\n      endCursor\\n      hasNextPage\\n      hasPreviousPage\\n      startCursor\\n      __typename\\n    }\\n    edges {\\n      cursor\\n      node {\\n        availability\\n        boxCondition\\n        createdAt\\n        id\\n        isActive\\n        isConsigned\\n        isListed\\n        isSold\\n        notes\\n        pairLocation\\n        purchaseDate\\n        purchasePlace\\n        purchasePrice\\n        updatedAt\\n        quantity\\n        sxOrders {\\n          edges {\\n            node {\\n              id\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        variant {\\n          createdAt\\n          id\\n          lowestPrice\\n          title\\n          updatedAt\\n          product {\\n            brandName\\n            category\\n            createdAt\\n            description\\n            id\\n            isActive\\n            lowestPrice\\n            isD2c\\n            priorityOrder\\n            skuId\\n            slug\\n            subCategory\\n            tags\\n            title\\n            updatedAt\\n            images {\\n              edges {\\n                node {\\n                  image\\n                  __typename\\n                }\\n                __typename\\n              }\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        platformListings {\\n          edges {\\n            node {\\n              createdAt\\n              id\\n              isActive\\n              isApproved\\n              marketplace {\\n                commissionPercentage\\n                title\\n                shippingCharges\\n                miscellaneousCharges\\n                __typename\\n              }\\n              resellerPayoutPrice\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    totalCount\\n    __typename\\n  }\\n}\"}",
  "method": "POST"
});


->res -> 
{
    "data": {
        "myInventories": {
            "pageInfo": {
                "endCursor": "YXJyYXljb25uZWN0aW9uOjk5",
                "hasNextPage": true,
                "hasPreviousPage": false,
                "startCursor": "YXJyYXljb25uZWN0aW9uOjA=",
                "__typename": "PageInfo"
            },
            "edges": [
                                {
                    "cursor": "YXJyYXljb25uZWN0aW9uOjA=",
                    "node": {
                        "availability": "eta",
                        "boxCondition": "new",
                        "createdAt": "2026-01-02T17:45:59.094404+00:00",
                        "id": "TXlJbnZlbnRvcnlUeXBlOjMwNTIyNg==",
                        "isActive": true,
                        "isConsigned": false,
                        "isListed": true,
                        "isSold": false,
                        "notes": "",
                        "pairLocation": "Delhi",
                        "purchaseDate": "2026-01-02",
                        "purchasePlace": "Retail",
                        "purchasePrice": 52000,
                        "updatedAt": "2026-01-02T17:45:59.094414+00:00",
                        "quantity": 2,
                        "sxOrders": {
                            "edges": [],
                            "__typename": "SxOrderTypeConnection"
                        },
                        "variant": {
                            "createdAt": "2025-09-11T19:10:17.435363+00:00",
                            "id": "VmFyaWFudFR5cGU6MTg4MzIy",
                            "lowestPrice": 72959,
                            "title": "ONESIZE",
                            "updatedAt": "2025-09-11T19:10:17.435383+00:00",
                            "product": {
                                "brandName": "louis vuitton",
                                "category": "wearables",
                                "createdAt": "2025-09-11T19:10:16.933459+00:00",
                                "description": "The Louis Vuitton Wallet Slender Monogram Eclipse Black Grey is a slim 2.2-pound wallet made out of monogram eclipse-coated canvas. This slender wallet is an environmentally friendly product because the leather used to make it is supplied by a tannery audited and certified by the Leather Working Group. It is 3.5 inches tall and 4.3 inches wide, and it boasts eight credit card slots as well as a single bill compartment.\n<br>\n<br>\nThe Louis Vuitton Wallet Slender Monogram Eclipse Black Grey was released in 2018. During its release, this wallet had a retail price of $440.<br><br>Please Note: Dust bag and box are not required for this accessory.",
                                "id": "UHJvZHVjdFR5cGU6MzU4NTE=",
                                "isActive": true,
                                "lowestPrice": 72959,
                                "isD2c": false,
                                "priorityOrder": 699,
                                "skuId": "STOCKXLOUPSE047",
                                "slug": "louis-vuitton-slender-wallet-monogram-eclipse",
                                "subCategory": "wallets",
                                "tags": [
                                    "accessories",
                                    "wallets",
                                    "card holders"
                                ],
                                "title": "Louis Vuitton Slender Wallet Monogram Eclipse",
                                "updatedAt": "2025-09-11T19:10:16.933469+00:00",
                                "images": {
                                    "edges": [
                                        {
                                            "node": {
                                                "image": "https://images.stockx.com/images/Louis-Vuitton-Wallet-Slender-Monogram-Eclipse-Black-Grey-3.jpg",
                                                "__typename": "ProductImageType"
                                            },
                                            "__typename": "ProductImageTypeEdge"
                                        },
                                        {
                                            "node": {
                                                "image": "https://images.stockx.com/images/Louis-Vuitton-Wallet-Slender-Monogram-Eclipse-Black-Grey-2.jpg",
                                                "__typename": "ProductImageType"
                                            },
                                            "__typename": "ProductImageTypeEdge"
                                        },
                                        {
                                            "node": {
                                                "image": "https://images.stockx.com/images/Louis-Vuitton-Wallet-Slender-Monogram-Eclipse-Black-Grey.jpg",
                                                "__typename": "ProductImageType"
                                            },
                                            "__typename": "ProductImageTypeEdge"
                                        }
                                    ],
                                    "__typename": "ProductImageTypeConnection"
                                },
                                "__typename": "ProductType"
                            },
                            "__typename": "VariantType"
                        },
                        "platformListings": {
                            "edges": [
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:45:59.156592+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEzMDEy",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 14,
                                            "title": "culturecircle",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 64000,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:45:59.156642+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEzMDEz",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "Culture Circle Purchase",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 64000,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:45:59.156678+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEzMDE0",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "crepdogcrew",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 64000,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:45:59.156711+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEzMDE1",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "culture-circle-banjara-hills-hyd-store",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 64000,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:45:59.156743+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEzMDE2",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "culturecircle-vk-delhi-store",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 64000,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:45:59.156775+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEzMDE3",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 11.12,
                                            "title": "findyourkicks",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 64000,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:45:59.156807+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEzMDE4",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "freesociety&others",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 64000,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:45:59.156838+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEzMDE5",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "guerdon",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 64000,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:45:59.156869+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEzMDIw",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 8.7,
                                            "title": "hyperyno",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 64000,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:45:59.156900+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEzMDIx",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "mainstreet",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 64000,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:45:59.156932+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEzMDIy",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "manual",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 64000,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:45:59.156963+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEzMDIz",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "solesearch",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 64000,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                }
                            ],
                            "__typename": "PlatformListingTypeConnection"
                        },
                        "__typename": "MyInventoryType"
                    },
                    "__typename": "MyInventoryTypeEdge"
                },
                {
                    "cursor": "YXJyYXljb25uZWN0aW9uOjE=",
                    "node": {
                        "availability": "eta",
                        "boxCondition": "new",
                        "createdAt": "2026-01-02T17:34:04.584686+00:00",
                        "id": "TXlJbnZlbnRvcnlUeXBlOjMwNTIwMw==",
                        "isActive": true,
                        "isConsigned": false,
                        "isListed": true,
                        "isSold": false,
                        "notes": "",
                        "pairLocation": "Delhi",
                        "purchaseDate": "2026-01-02",
                        "purchasePlace": "Retail",
                        "purchasePrice": 9000,
                        "updatedAt": "2026-01-02T17:34:04.584696+00:00",
                        "quantity": 4,
                        "sxOrders": {
                            "edges": [],
                            "__typename": "SxOrderTypeConnection"
                        },
                        "variant": {
                            "createdAt": "2025-11-27T16:38:37.203181+00:00",
                            "id": "VmFyaWFudFR5cGU6NTY3Mjc3",
                            "lowestPrice": 12527,
                            "title": "ONESIZE",
                            "updatedAt": "2025-11-27T16:38:37.203197+00:00",
                            "product": {
                                "brandName": "Coach",
                                "category": "wearables",
                                "createdAt": "2025-11-27T16:38:37.107418+00:00",
                                "description": "",
                                "id": "UHJvZHVjdFR5cGU6ODQwNjg=",
                                "isActive": true,
                                "lowestPrice": 12527,
                                "isD2c": false,
                                "priorityOrder": 434,
                                "skuId": "COAACKD39D28",
                                "slug": "coach-3-in-1-wallet-in-signature-leather-smooth-leather-black",
                                "subCategory": "wallets",
                                "tags": [
                                    "accessories",
                                    "wallets",
                                    "card holders"
                                ],
                                "title": "Coach 3 In 1 Wallet In Signature Leather Smooth Leather-Black",
                                "updatedAt": "2025-11-27T16:38:37.107434+00:00",
                                "images": {
                                    "edges": [
                                        {
                                            "node": {
                                                "image": "https://offkicks.co/cdn/shop/files/cr957_blk_a0_a69fcaa4-ff3d-4394-ac75-f4955d4ce608_640x_crop_center.webp?v=1759837764",
                                                "__typename": "ProductImageType"
                                            },
                                            "__typename": "ProductImageTypeEdge"
                                        }
                                    ],
                                    "__typename": "ProductImageTypeConnection"
                                },
                                "__typename": "ProductType"
                            },
                            "__typename": "VariantType"
                        },
                        "platformListings": {
                            "edges": [
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:34:04.657912+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEyNzM2",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 14,
                                            "title": "culturecircle",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 10990,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:34:04.657949+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEyNzM3",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "Culture Circle Purchase",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 10990,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:34:04.657973+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEyNzM4",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "crepdogcrew",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 10990,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:34:04.657996+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEyNzM5",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "culture-circle-banjara-hills-hyd-store",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 10990,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:34:04.658021+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEyNzQw",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "culturecircle-vk-delhi-store",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 10990,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:34:04.658041+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEyNzQx",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 11.12,
                                            "title": "findyourkicks",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 10990,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:34:04.658060+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEyNzQy",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "freesociety&others",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 10990,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:34:04.658096+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEyNzQz",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "guerdon",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 10990,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:34:04.658118+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEyNzQ0",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 8.7,
                                            "title": "hyperyno",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 10990,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:34:04.658138+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEyNzQ1",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "mainstreet",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 10990,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:34:04.658162+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEyNzQ2",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "manual",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 10990,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                },
                                {
                                    "node": {
                                        "createdAt": "2026-01-02T17:34:04.658186+00:00",
                                        "id": "UGxhdGZvcm1MaXN0aW5nVHlwZToyMjEyNzQ3",
                                        "isActive": true,
                                        "isApproved": true,
                                        "marketplace": {
                                            "commissionPercentage": 0,
                                            "title": "solesearch",
                                            "shippingCharges": 0,
                                            "miscellaneousCharges": 0,
                                            "__typename": "MarketplaceType"
                                        },
                                        "resellerPayoutPrice": 10990,
                                        "__typename": "PlatformListingType"
                                    },
                                    "__typename": "PlatformListingTypeEdge"
                                }
                            ],
                            "__typename": "PlatformListingTypeConnection"
                        },
                        "__typename": "MyInventoryType"
                    },
                    "__typename": "MyInventoryTypeEdge"
                }
                /// rest skipped for token limitations 
            ],
            "totalCount": 1401,
            "__typename": "MyInventoryTypeConnection"
        }
    }
}

__________________________


pagination request->

fetch("https://api.culture-circle.com/graphql", {
  "headers": {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY3NDQ5MjgzLCJpYXQiOjE3Njc0NDU2ODMsImp0aSI6IjhjNWI0YTQ5MDQzODQxYzU4NmFhMDgzMDJiOGRkODVjIiwidXNlcl9pZCI6MTczNDEzfQ.Z3fQT2IvFOVGcx6DB0-p14jNBVUDrUPJXmRn-a8DXXo",
    "cache-control": "no-cache",
    "content-type": "application/json",
    "pragma": "no-cache",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Brave\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "sec-gpc": "1",
    "Referer": "https://sourcex.app/"
  },
  "body": "{\"operationName\":\"MyInventory\",\"variables\":{\"after\":\"YXJyYXljb25uZWN0aW9uOjk5\",\"first\":100,\"filters\":{\"isSold\":{},\"isListed\":{},\"isConsigned\":{\"exact\":false}}},\"query\":\"query MyInventory($after: String, $first: Int!, $filters: InventoryFilter) {\\n  myInventories(\\n    after: $after\\n    first: $first\\n    order: {createdAt: DESC}\\n    filters: $filters\\n  ) {\\n    pageInfo {\\n      endCursor\\n      hasNextPage\\n      hasPreviousPage\\n      startCursor\\n      __typename\\n    }\\n    edges {\\n      cursor\\n      node {\\n        availability\\n        boxCondition\\n        createdAt\\n        id\\n        isActive\\n        isConsigned\\n        isListed\\n        isSold\\n        notes\\n        pairLocation\\n        purchaseDate\\n        purchasePlace\\n        purchasePrice\\n        updatedAt\\n        quantity\\n        sxOrders {\\n          edges {\\n            node {\\n              id\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        variant {\\n          createdAt\\n          id\\n          lowestPrice\\n          title\\n          updatedAt\\n          product {\\n            brandName\\n            category\\n            createdAt\\n            description\\n            id\\n            isActive\\n            lowestPrice\\n            isD2c\\n            priorityOrder\\n            skuId\\n            slug\\n            subCategory\\n            tags\\n            title\\n            updatedAt\\n            images {\\n              edges {\\n                node {\\n                  image\\n                  __typename\\n                }\\n                __typename\\n              }\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        platformListings {\\n          edges {\\n            node {\\n              createdAt\\n              id\\n              isActive\\n              isApproved\\n              marketplace {\\n                commissionPercentage\\n                title\\n                shippingCharges\\n                miscellaneousCharges\\n                __typename\\n              }\\n              resellerPayoutPrice\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    totalCount\\n    __typename\\n  }\\n}\"}",
  "method": "POST"
});

_____________________


lowest not lowest request -> (12sec response time)

fetch("https://api.culture-circle.com/graphql", {
  "headers": {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY3NDQ5MjgzLCJpYXQiOjE3Njc0NDU2ODMsImp0aSI6IjhjNWI0YTQ5MDQzODQxYzU4NmFhMDgzMDJiOGRkODVjIiwidXNlcl9pZCI6MTczNDEzfQ.Z3fQT2IvFOVGcx6DB0-p14jNBVUDrUPJXmRn-a8DXXo",
    "cache-control": "no-cache",
    "content-type": "application/json",
    "pragma": "no-cache",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Brave\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "sec-gpc": "1",
    "Referer": "https://sourcex.app/"
  },
  "body": "{\"operationName\":\"LowestAndNotLowest\",\"variables\":{\"isLowest\":true,\"order\":{},\"first\":100,\"after\":\"\"},\"query\":\"query LowestAndNotLowest($isLowest: Boolean = true, $order: InventoryOrder = {}, $first: Int = 100, $after: String = \\\"\\\") {\\n  lowestNotLowest(\\n    isLowest: $isLowest\\n    order: $order\\n    first: $first\\n    after: $after\\n    filters: {isConsigned: {exact: false}}\\n  ) {\\n    pageInfo {\\n      endCursor\\n      hasNextPage\\n      hasPreviousPage\\n      startCursor\\n      __typename\\n    }\\n    totalCount\\n    edges {\\n      node {\\n        availability\\n        boxCondition\\n        createdAt\\n        id\\n        isActive\\n        isConsigned\\n        isSold\\n        isListed\\n        notes\\n        pairLocation\\n        purchaseDate\\n        purchasePlace\\n        purchasePrice\\n        quantity\\n        sxOrders {\\n          edges {\\n            node {\\n              id\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        variant {\\n          createdAt\\n          id\\n          lowestPrice\\n          title\\n          updatedAt\\n          product {\\n            brandName\\n            category\\n            createdAt\\n            description\\n            id\\n            isD2c\\n            isActive\\n            lowestPrice\\n            priorityOrder\\n            skuId\\n            slug\\n            subCategory\\n            tags\\n            title\\n            updatedAt\\n            images {\\n              edges {\\n                node {\\n                  image\\n                  __typename\\n                }\\n                __typename\\n              }\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        platformListings {\\n          edges {\\n            node {\\n              id\\n              createdAt\\n              isActive\\n              resellerPayoutPrice\\n              resellerPayoutPriceSx\\n              updatedAt\\n              isApproved\\n              marketplace {\\n                additionalDetails\\n                address\\n                city\\n                commissionPercentage\\n                country\\n                marketplaceUrl\\n                id\\n                miscellaneousCharges\\n                shippingCharges\\n                phone\\n                title\\n                __typename\\n              }\\n              platform\\n              marketplaceListingId\\n              trackingId\\n              status\\n              trackingLink\\n              trackingProvider\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        sxOrders {\\n          edges {\\n            node {\\n              id\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\"}",
  "method": "POST"
});

______________________

fetch("https://api.culture-circle.com/graphql", {
  "headers": {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY3NDQ5MjgzLCJpYXQiOjE3Njc0NDU2ODMsImp0aSI6IjhjNWI0YTQ5MDQzODQxYzU4NmFhMDgzMDJiOGRkODVjIiwidXNlcl9pZCI6MTczNDEzfQ.Z3fQT2IvFOVGcx6DB0-p14jNBVUDrUPJXmRn-a8DXXo",
    "cache-control": "no-cache",
    "content-type": "application/json",
    "pragma": "no-cache",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Brave\";v=\"143\", \"Chromium\";v=\"143\", \"Not A(Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "sec-gpc": "1",
    "Referer": "https://sourcex.app/"
  },
  "body": "{\"operationName\":\"LowestAndNotLowest\",\"variables\":{\"isLowest\":false,\"order\":{},\"first\":100,\"after\":\"\"},\"query\":\"query LowestAndNotLowest($isLowest: Boolean = true, $order: InventoryOrder = {}, $first: Int = 100, $after: String = \\\"\\\") {\\n  lowestNotLowest(\\n    isLowest: $isLowest\\n    order: $order\\n    first: $first\\n    after: $after\\n    filters: {isConsigned: {exact: false}}\\n  ) {\\n    pageInfo {\\n      endCursor\\n      hasNextPage\\n      hasPreviousPage\\n      startCursor\\n      __typename\\n    }\\n    totalCount\\n    edges {\\n      node {\\n        availability\\n        boxCondition\\n        createdAt\\n        id\\n        isActive\\n        isConsigned\\n        isSold\\n        isListed\\n        notes\\n        pairLocation\\n        purchaseDate\\n        purchasePlace\\n        purchasePrice\\n        quantity\\n        sxOrders {\\n          edges {\\n            node {\\n              id\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        variant {\\n          createdAt\\n          id\\n          lowestPrice\\n          title\\n          updatedAt\\n          product {\\n            brandName\\n            category\\n            createdAt\\n            description\\n            id\\n            isD2c\\n            isActive\\n            lowestPrice\\n            priorityOrder\\n            skuId\\n            slug\\n            subCategory\\n            tags\\n            title\\n            updatedAt\\n            images {\\n              edges {\\n                node {\\n                  image\\n                  __typename\\n                }\\n                __typename\\n              }\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        platformListings {\\n          edges {\\n            node {\\n              id\\n              createdAt\\n              isActive\\n              resellerPayoutPrice\\n              resellerPayoutPriceSx\\n              updatedAt\\n              isApproved\\n              marketplace {\\n                additionalDetails\\n                address\\n                city\\n                commissionPercentage\\n                country\\n                marketplaceUrl\\n                id\\n                miscellaneousCharges\\n                shippingCharges\\n                phone\\n                title\\n                __typename\\n              }\\n              platform\\n              marketplaceListingId\\n              trackingId\\n              status\\n              trackingLink\\n              trackingProvider\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        sxOrders {\\n          edges {\\n            node {\\n              id\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\"}",
  "method": "POST"
});


_______________________


operationName : "MyInventory"
responses in -> data -> myInventories

operationName : "LowestAndNotLowest"
responses in -> data -> lowestNotLowest 