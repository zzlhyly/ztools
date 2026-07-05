## ADDED Requirements

### Requirement: CIDR parsing

The system SHALL parse a CIDR notation input (e.g., `192.168.1.0/24`) and display the network address, broadcast address, host address range, total host count, and subnet mask.

#### Scenario: Parse /24 network

- **WHEN** user enters `10.0.0.0/24`
- **THEN** the system displays:
  - Network Address: `10.0.0.0`
  - Broadcast Address: `10.0.0.255`
  - Host Range: `10.0.0.1 - 10.0.0.254`
  - Total Hosts: `254`
  - Subnet Mask: `255.255.255.0`

#### Scenario: Parse /16 network

- **WHEN** user enters `172.16.0.0/16`
- **THEN** the system displays subnet mask `255.255.0.0` and total hosts `65,534`

### Requirement: Wildcard mask display

The system SHALL also display the wildcard mask (inverse of subnet mask) commonly used in ACLs and routing.

#### Scenario: Wildcard for /24

- **WHEN** user enters `192.168.1.0/24`
- **THEN** the wildcard mask is displayed as `0.0.0.255`

### Requirement: IP address validation

The system SHALL validate that the IP address portion of the CIDR input is a valid IPv4 address and that the prefix length is between 0 and 32.

#### Scenario: Invalid IP

- **WHEN** user enters `256.1.1.0/24`
- **THEN** an error message "Invalid IPv4 address" is displayed

#### Scenario: Invalid prefix

- **WHEN** user enters `10.0.0.0/33`
- **THEN** an error message "Prefix must be between 0 and 32" is displayed
