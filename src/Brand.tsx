import mark from './assets/velora-mark.svg';

export function BrandMark({className=''}:{className?:string}) {
  return <img className={`velora-brand-mark ${className}`} src={mark} alt="" draggable={false}/>;
}
