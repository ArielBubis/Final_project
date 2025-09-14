import React from 'react';
import PropTypes from 'prop-types';
import { Input, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

/**
 * SearchInput - Reusable search input component
 */
const SearchInput = ({
    placeholder = "Search...",
    value,
    onChange,
    onSearch,
    allowClear = true,
    size = 'default',
    className = '',
    style = {}
}) => {
    const handleChange = (e) => {
        if (onChange) {
            onChange(e.target.value);
        }
    };

    const handleSearch = (value) => {
        if (onSearch) {
            onSearch(value);
        }
    };

    return (
        <Input
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            onPressEnter={(e) => handleSearch(e.target.value)}
            allowClear={allowClear}
            size={size}
            className={className}
            style={style}
            prefix={<SearchOutlined />}
        />
    );
};

SearchInput.propTypes = {
    placeholder: PropTypes.string,
    value: PropTypes.string,
    onChange: PropTypes.func,
    onSearch: PropTypes.func,
    allowClear: PropTypes.bool,
    size: PropTypes.oneOf(['small', 'default', 'large']),
    className: PropTypes.string,
    style: PropTypes.object
};

export default SearchInput;