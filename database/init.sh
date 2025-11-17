#!/bin/bash

# Database Initialization Script
# This script creates the database and runs the schema

echo "Campus Placement Management System - Database Initialization"
echo "============================================================"

# Read database credentials
read -p "MySQL Username: " DB_USER
read -sp "MySQL Password: " DB_PASS
echo ""
read -p "Database Name (default: campus_placement_db): " DB_NAME
DB_NAME=${DB_NAME:-campus_placement_db}

echo ""
echo "Creating database..."
mysql -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;"

if [ $? -eq 0 ]; then
    echo "Database created successfully!"
else
    echo "Error creating database. Please check your credentials."
    exit 1
fi

echo ""
echo "Running schema..."
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < schema.sql

if [ $? -eq 0 ]; then
    echo "Schema applied successfully!"
else
    echo "Error applying schema."
    exit 1
fi

read -p "Do you want to load seed data? (y/n): " LOAD_SEED
if [ "$LOAD_SEED" = "y" ] || [ "$LOAD_SEED" = "Y" ]; then
    echo "Loading seed data..."
    mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < seed.sql
    if [ $? -eq 0 ]; then
        echo "Seed data loaded successfully!"
    else
        echo "Error loading seed data."
    fi
fi

echo ""
echo "Database initialization complete!"
echo "Please update your backend/.env file with the database credentials."

