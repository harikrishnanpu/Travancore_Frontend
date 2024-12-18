import React from 'react';

export default function MessageBox(props) {
  return (
    <div className={`alert alert-${props.variant || 'info'} mx-auto text-center mb-2`}>
      <p className='text-sm'>{props.children}</p>
    </div>
  );
}
